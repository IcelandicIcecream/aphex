import { describe, it, expect, vi } from 'vitest';
import { serveAssetCDN } from '@aphexcms/cms-core/server';

/**
 * `/media/:id/:filename` — the asset delivery route.
 *
 * The behaviour under test is the serving *posture*: this route runs privacy
 * and organization checks and must then serve the bytes itself. It previously
 * 302'd straight to `asset.url` whenever that looked absolute, which made those
 * checks decorative for S3/R2-backed assets and broke entirely against a
 * private bucket, whose public URL isn't readable.
 */

type FakeAsset = {
	id: string;
	organizationId: string;
	path: string;
	url: string;
	filename: string;
	originalFilename: string;
	mimeType: string;
	size: number;
	metadata?: Record<string, unknown>;
};

const PUBLIC_ASSET: FakeAsset = {
	id: 'asset-1',
	organizationId: 'org-a',
	path: 'bucket/pic.png',
	// An absolute bucket URL, as an S3/R2 upload used to store.
	url: 'https://cdn.example.com/bucket/pic.png',
	filename: 'pic.png',
	originalFilename: 'pic.png',
	mimeType: 'image/png',
	size: 8
};

/** Marked private by the schema field it was uploaded into. */
const PRIVATE_ASSET: FakeAsset = {
	...PUBLIC_ASSET,
	id: 'asset-2',
	metadata: { schemaType: 'page', fieldPath: 'secret' }
};

const FILE_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function buildEvent(
	opts: {
		asset?: FakeAsset | null;
		auth?: { organizationId: string } | null;
		signedDownloads?: {
			shouldUseSignedURL: (asset: any) => boolean | Promise<boolean>;
			expiresIn?: number;
		};
		/** Omit to model an adapter that can't mint signed URLs. */
		getSignedUrl?: (path: string, expiresIn?: number) => Promise<string>;
		storageAdapter?: unknown;
	} = {}
) {
	const asset = opts.asset === undefined ? PUBLIC_ASSET : opts.asset;
	const headers: Record<string, string> = {};

	const storageAdapter =
		'storageAdapter' in opts
			? opts.storageAdapter
			: {
					name: 'fake',
					getObject: vi.fn(async () => FILE_BYTES),
					...(opts.getSignedUrl ? { getSignedUrl: opts.getSignedUrl } : {})
				};

	return {
		event: {
			params: { id: asset?.id ?? 'missing', filename: 'pic.png' },
			request: new Request('http://localhost/media/asset-1/pic.png'),
			setHeaders: (h: Record<string, string>) => Object.assign(headers, h),
			locals: {
				auth: opts.auth
					? { type: 'session', organizationId: opts.auth.organizationId, user: { id: 'u' } }
					: null,
				aphexCMS: {
					assetService: { findAssetByIdGlobal: async () => asset },
					databaseAdapter: {},
					storageAdapter,
					cmsEngine: {
						// `page.secret` is an image field flagged private; anything else
						// resolves to nothing and the asset is treated as public.
						getSchemaTypeByName: (name: string) =>
							name === 'page'
								? { fields: [{ name: 'secret', type: 'image', private: true }] }
								: null
					},
					config: opts.signedDownloads ? { signedDownloads: opts.signedDownloads } : {}
				}
			}
		} as any,
		headers,
		storageAdapter: storageAdapter as any
	};
}

describe('GET /media/:id/:filename — serving posture', () => {
	it('proxies the bytes instead of redirecting to an absolute bucket URL', async () => {
		const { event, storageAdapter } = buildEvent();
		const res = await serveAssetCDN(event);

		expect(res.status).toBe(200);
		expect(res.headers.get('Location')).toBeNull();
		expect(storageAdapter.getObject).toHaveBeenCalledWith(PUBLIC_ASSET.path);
		expect(Buffer.from(await res.arrayBuffer())).toEqual(FILE_BYTES);
	});

	it('404s an unknown asset', async () => {
		const { event } = buildEvent({ asset: null });
		const res = await serveAssetCDN(event);
		expect(res.status).toBe(404);
	});

	it('500s when no storage adapter is configured', async () => {
		const { event } = buildEvent({ storageAdapter: undefined });
		const res = await serveAssetCDN(event);
		expect(res.status).toBe(500);
	});
});

describe('GET /media/:id/:filename — access control', () => {
	it('401s a private asset for an anonymous caller', async () => {
		const { event } = buildEvent({ asset: PRIVATE_ASSET, auth: null });
		const res = await serveAssetCDN(event);
		expect(res.status).toBe(401);
	});

	it('403s a private asset for a different organization', async () => {
		const { event } = buildEvent({ asset: PRIVATE_ASSET, auth: { organizationId: 'org-b' } });
		const res = await serveAssetCDN(event);
		expect(res.status).toBe(403);
	});

	it('serves a private asset to its own organization', async () => {
		const { event } = buildEvent({ asset: PRIVATE_ASSET, auth: { organizationId: 'org-a' } });
		const res = await serveAssetCDN(event);
		expect(res.status).toBe(200);
	});
});

describe('GET /media/:id/:filename — cache headers', () => {
	it('marks a public asset immutable and shareable', async () => {
		const { event, headers } = buildEvent();
		await serveAssetCDN(event);
		expect(headers['Cache-Control']).toBe('public, max-age=31536000, immutable');
	});

	it('keeps a private asset out of shared caches', async () => {
		// The bytes now flow through the app, so a CDN in front of it would
		// otherwise hand the file to the next caller without re-running the checks.
		const { event, headers } = buildEvent({
			asset: PRIVATE_ASSET,
			auth: { organizationId: 'org-a' }
		});
		await serveAssetCDN(event);
		expect(headers['Cache-Control']).toBe('private, no-store');
	});
});

describe('GET /media/:id/:filename — signedDownloads opt-out', () => {
	it('redirects to a signed URL when the predicate says so', async () => {
		const getSignedUrl = vi.fn(async () => 'https://cdn.example.com/signed?sig=abc');
		const { event } = buildEvent({
			signedDownloads: { shouldUseSignedURL: () => true, expiresIn: 60 },
			getSignedUrl
		});
		const res = await serveAssetCDN(event);

		expect(res.status).toBe(302);
		expect(res.headers.get('Location')).toBe('https://cdn.example.com/signed?sig=abc');
		// A URL that expires must not be cached by a shared proxy.
		expect(res.headers.get('Cache-Control')).toBe('private, no-store');
		expect(getSignedUrl).toHaveBeenCalledWith(PUBLIC_ASSET.path, 60);
	});

	it('defaults the signed-URL lifetime to 15 minutes', async () => {
		const getSignedUrl = vi.fn(async () => 'https://cdn.example.com/signed');
		const { event } = buildEvent({
			signedDownloads: { shouldUseSignedURL: () => true },
			getSignedUrl
		});
		await serveAssetCDN(event);
		expect(getSignedUrl).toHaveBeenCalledWith(PUBLIC_ASSET.path, 900);
	});

	it('proxies when the predicate declines', async () => {
		const getSignedUrl = vi.fn(async () => 'https://cdn.example.com/signed');
		const { event } = buildEvent({
			signedDownloads: { shouldUseSignedURL: () => false },
			getSignedUrl
		});
		const res = await serveAssetCDN(event);
		expect(res.status).toBe(200);
		expect(getSignedUrl).not.toHaveBeenCalled();
	});

	it('proxies when the adapter cannot sign', async () => {
		// Serving the file correctly beats refusing to serve it.
		const { event } = buildEvent({ signedDownloads: { shouldUseSignedURL: () => true } });
		const res = await serveAssetCDN(event);
		expect(res.status).toBe(200);
	});

	it('proxies when the predicate throws', async () => {
		const getSignedUrl = vi.fn(async () => 'https://cdn.example.com/signed');
		const { event } = buildEvent({
			signedDownloads: {
				shouldUseSignedURL: () => {
					throw new Error('boom');
				}
			},
			getSignedUrl
		});
		const res = await serveAssetCDN(event);
		expect(res.status).toBe(200);
		expect(getSignedUrl).not.toHaveBeenCalled();
	});

	it('runs the access checks BEFORE signing', async () => {
		// A signed URL bypasses this route on the follow-up request, so it must
		// only ever be minted for a caller that already passed the checks.
		const getSignedUrl = vi.fn(async () => 'https://cdn.example.com/signed');
		const { event } = buildEvent({
			asset: PRIVATE_ASSET,
			auth: null,
			signedDownloads: { shouldUseSignedURL: () => true },
			getSignedUrl
		});
		const res = await serveAssetCDN(event);

		expect(res.status).toBe(401);
		expect(getSignedUrl).not.toHaveBeenCalled();
	});
});
