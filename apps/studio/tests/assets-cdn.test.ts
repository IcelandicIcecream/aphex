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
		/** Opt in to model an adapter that can stream; default models one that can't. */
		canStream?: boolean;
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
					...(opts.canStream
						? {
								getStream: vi.fn(
									async () =>
										new ReadableStream<Uint8Array>({
											start(controller) {
												controller.enqueue(new Uint8Array(FILE_BYTES));
												controller.close();
											}
										})
								)
							}
						: {}),
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

/**
 * Buffering the whole object is not merely wasteful on a serverless host, it
 * fails: Vercel Functions cap a response body at 4.5 MB and return 413 beyond
 * it, while a streamed response is exempt. So an adapter that can stream must
 * be allowed to, and the buffering path has to remain for adapters that can't.
 */
describe('GET /media/:id/:filename — streaming', () => {
	it('streams the bytes when the adapter supports it', async () => {
		const { event, storageAdapter } = buildEvent({ canStream: true });
		const res = await serveAssetCDN(event);

		expect(res.status).toBe(200);
		expect(storageAdapter.getStream).toHaveBeenCalledWith(PUBLIC_ASSET.path);
		// The whole point: the object never lands in a Buffer in-process.
		expect(storageAdapter.getObject).not.toHaveBeenCalled();
		expect(Buffer.from(await res.arrayBuffer())).toEqual(FILE_BYTES);
	});

	it('falls back to buffering when the adapter cannot stream', async () => {
		const { event, storageAdapter } = buildEvent();
		const res = await serveAssetCDN(event);

		expect(res.status).toBe(200);
		expect(storageAdapter.getStream).toBeUndefined();
		expect(storageAdapter.getObject).toHaveBeenCalledWith(PUBLIC_ASSET.path);
	});

	it('takes Content-Length from the asset row when streaming', async () => {
		// A stream carries no length of its own, so the row is the only source.
		const { event, headers } = buildEvent({ canStream: true });
		await serveAssetCDN(event);

		expect(headers['Content-Length']).toBe(String(PUBLIC_ASSET.size));
	});

	it('omits Content-Length rather than guessing when the row has no size', async () => {
		// A wrong Content-Length truncates the response or hangs the client;
		// omitting it is well-defined.
		const { event, headers } = buildEvent({
			canStream: true,
			asset: { ...PUBLIC_ASSET, size: undefined as unknown as number }
		});
		await serveAssetCDN(event);

		expect(headers['Content-Length']).toBeUndefined();
	});

	it('runs the access checks BEFORE opening a stream', async () => {
		const { event, storageAdapter } = buildEvent({
			asset: PRIVATE_ASSET,
			auth: null,
			canStream: true
		});
		const res = await serveAssetCDN(event);

		expect(res.status).toBe(401);
		expect(storageAdapter.getStream).not.toHaveBeenCalled();
	});

	it('prefers a signed redirect over streaming when configured', async () => {
		const { event, storageAdapter } = buildEvent({
			canStream: true,
			signedDownloads: { shouldUseSignedURL: () => true },
			getSignedUrl: async () => 'https://cdn.example.com/signed?sig=abc'
		});
		const res = await serveAssetCDN(event);

		expect(res.status).toBe(302);
		expect(storageAdapter.getStream).not.toHaveBeenCalled();
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

/**
 * Derivatives are served by this same route, which is the security-relevant
 * decision: they inherit its privacy and organization checks rather than
 * reimplementing them. A separate image endpoint that drifted would serve a
 * public derivative of a private original, cached at the edge under a
 * guessable key — the hole Payload users hit handing resizing to Next.js.
 */
describe('GET /media/:id/:filename — variants', () => {
	const IMAGE_ASSET: FakeAsset = { ...PUBLIC_ASSET, assetType: 'image' } as FakeAsset;

	function variantEvent(
		filename: string,
		opts: { asset?: FakeAsset; auth?: { organizationId: string } | null } = {}
	) {
		const built = buildEvent({ asset: opts.asset ?? IMAGE_ASSET, auth: opts.auth });
		built.event.params.filename = filename;
		built.event.locals.aphexCMS.config = {
			images: { widths: [320, 640], quality: 80 }
		};
		return built;
	}

	it('serves the original for a width outside the ladder', async () => {
		// The ladder being a closed set is what stops arbitrary dimensions
		// turning into unbounded CPU and storage, so an off-ladder request must
		// never trigger generation.
		const { event, storageAdapter } = variantEvent('w9999-abc.webp');
		const res = await serveAssetCDN(event);

		expect(res.status).toBe(200);
		expect(storageAdapter.getObject).toHaveBeenCalledWith(IMAGE_ASSET.path);
	});

	it('serves the original for a stale config hash', async () => {
		// Variants under a superseded config are orphaned, never served.
		const { event, storageAdapter } = variantEvent('w320-stalehash.webp');
		const res = await serveAssetCDN(event);

		expect(res.status).toBe(200);
		expect(storageAdapter.getObject).toHaveBeenCalledWith(IMAGE_ASSET.path);
	});

	it('serves the original when the filename is not a variant at all', async () => {
		const { event, storageAdapter } = variantEvent('pic.png');
		const res = await serveAssetCDN(event);

		expect(res.status).toBe(200);
		expect(storageAdapter.getObject).toHaveBeenCalledWith(IMAGE_ASSET.path);
	});

	it('refuses a variant of a private asset to an anonymous caller', async () => {
		// The check that matters: a derivative must not be a way around the
		// original's privacy.
		const { event, storageAdapter } = variantEvent('w320-abc.webp', {
			asset: { ...PRIVATE_ASSET, assetType: 'image' } as FakeAsset,
			auth: null
		});
		const res = await serveAssetCDN(event);

		expect(res.status).toBe(401);
		expect(storageAdapter.getObject).not.toHaveBeenCalled();
	});
});
