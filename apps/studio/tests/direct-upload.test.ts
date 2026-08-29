import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { assetsDirectUploadRouter } from '@aphexcms/cms-core/server/api/routes/assets-direct-upload';
// Imported by path rather than from the server barrel: this is a crypto
// primitive, and it doesn't belong on the public surface just to build a
// forged ticket in a test.
import { encryptSecret } from '@aphexcms/cms-core/security/secret-crypto';

/**
 * Direct-to-storage upload.
 *
 * The security surface here is unusual and worth stating: the signed URL
 * bypasses `bodyLimit` entirely, and the bytes never pass through the app. So
 * every invariant the proxy path gets for free — the caller may upload, the key
 * is ours, the size is within the ceiling, the object actually exists — has to
 * be re-established explicitly, and none of it may be taken from the client.
 */

const SECRET = 'test-encryption-key-at-least-32-chars-long';
const ORG = 'org-a';

function buildApp(
	opts: {
		capabilities?: string[];
		organizationId?: string;
		/** Distinct from a `secret: undefined` option, which would just re-trigger the default. */
		hasSecret?: boolean;
		canSign?: boolean;
		maxFileSize?: number;
		objectSize?: number | null;
		finalize?: ReturnType<typeof vi.fn>;
	} = {}
) {
	const {
		capabilities = ['asset.upload'],
		organizationId = ORG,
		hasSecret = true,
		canSign = true,
		maxFileSize,
		objectSize = 1234
	} = opts;

	const getSignedUploadUrl = vi.fn(async (path: string) => `https://bucket.example/${path}?sig=x`);
	const resolvePath = vi.fn((key: string) => `bucket/${key}`);
	const deleteObject = vi.fn(async () => true);

	const storageAdapter = canSign
		? { name: 's3', getSignedUploadUrl, resolvePath, delete: deleteObject }
		: { name: 'local' };

	const finalize =
		opts.finalize ??
		vi.fn(async (org: string, ticket: any) => ({ id: ticket.assetId, organizationId: org }));

	const app = new Hono();
	app.use('*', async (c, next) => {
		c.set('aphexCMS', c.env.aphexCMS);
		c.set('auth', c.env.auth);
		await next();
	});
	app.route('/assets', assetsDirectUploadRouter as any);

	const env = {
		aphexCMS: {
			storageAdapter,
			assetService: { finalizeDirectUpload: finalize },
			config: {
				security: hasSecret ? { secretEncryptionKey: SECRET } : {},
				...(maxFileSize ? { upload: { maxFileSize } } : {})
			}
		},
		auth: {
			type: 'session',
			organizationId,
			user: { id: 'u1', role: 'user' },
			capabilities
		}
	};

	return { app, env, getSignedUploadUrl, resolvePath, finalize, storageAdapter };
}

const post = (
	app: Hono,
	env: any,
	path: string,
	body: unknown,
	headers: Record<string, string> = {}
) =>
	app.fetch(
		new Request(`http://localhost/assets${path}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', ...headers },
			body: JSON.stringify(body)
		}),
		env as any
	);

const validBody = {
	filename: 'photo.jpg',
	mimeType: 'image/jpeg',
	size: 5 * 1024 * 1024
};

describe('POST /assets/upload-url', () => {
	it('issues a signed URL and a ticket', async () => {
		const { app, env, getSignedUploadUrl } = buildApp();
		const res = await post(app, env, '/upload-url', validBody);
		const json = await res.json();

		expect(res.status).toBe(200);
		expect(json.data.uploadUrl).toContain('sig=x');
		expect(json.data.ticket).toBeTruthy();
		expect(json.data.headers['Content-Type']).toBe('image/jpeg');
		expect(getSignedUploadUrl).toHaveBeenCalledTimes(1);
	});

	it('derives the key from a fresh asset id, never the filename', async () => {
		// A caller-supplied key would let anyone holding `asset.upload` write
		// anywhere in the bucket, including over an existing asset's original.
		const { app, env, resolvePath } = buildApp();
		const res = await post(app, env, '/upload-url', {
			...validBody,
			filename: '../../evil.jpg'
		});
		const json = await res.json();

		const key = resolvePath.mock.calls[0]![0];
		expect(key).toBe(`${json.data.assetId}/original.jpg`);
		expect(key).not.toContain('..');
		expect(key).not.toContain('evil');
	});

	it('mints a different asset id per request', async () => {
		const { app, env } = buildApp();
		const a = await (await post(app, env, '/upload-url', validBody)).json();
		const b = await (await post(app, env, '/upload-url', validBody)).json();
		expect(a.data.assetId).not.toBe(b.data.assetId);
	});

	it('401s an anonymous caller', async () => {
		const { app, env } = buildApp();
		const res = await post(app, { ...env, auth: null }, '/upload-url', validBody);
		expect(res.status).toBe(401);
	});

	it('403s without asset.upload', async () => {
		const { app, env } = buildApp({ capabilities: ['asset.read'] });
		const res = await post(app, env, '/upload-url', validBody);
		expect(res.status).toBe(403);
	});

	it('413s a file already known to exceed the limit', async () => {
		// No point handing out a write grant for an upload that will be rejected.
		const { app, env, getSignedUploadUrl } = buildApp({ maxFileSize: 1024 });
		const res = await post(app, env, '/upload-url', validBody);
		expect(res.status).toBe(413);
		expect(getSignedUploadUrl).not.toHaveBeenCalled();
	});

	it('404s when the adapter cannot sign', async () => {
		// Unavailable, not broken — the client falls back to proxying the upload.
		const { app, env } = buildApp({ canSign: false });
		const res = await post(app, env, '/upload-url', validBody);
		expect(res.status).toBe(404);
	});

	it('404s when no encryption key is configured', async () => {
		// Without it the ticket can't be sealed, and an unsealed ticket would mean
		// trusting the client about where bytes live.
		const { app, env } = buildApp({ hasSecret: false });
		const res = await post(app, env, '/upload-url', validBody);
		expect(res.status).toBe(404);
	});

	it('400s a malformed request', async () => {
		const { app, env } = buildApp();
		const res = await post(app, env, '/upload-url', { filename: '', mimeType: '', size: -1 });
		expect(res.status).toBe(400);
	});
});

describe('POST /assets/confirm', () => {
	async function issueTicket(app: Hono, env: any) {
		const res = await post(app, env, '/upload-url', validBody);
		return (await res.json()).data as { assetId: string; ticket: string };
	}

	it('creates the asset when the ticket is valid', async () => {
		const { app, env, finalize } = buildApp();
		const { assetId, ticket } = await issueTicket(app, env);

		const res = await post(app, env, '/confirm', { assetId }, { 'x-upload-ticket': ticket });
		expect(res.status).toBe(200);

		// The intent comes from the sealed ticket, not the request body.
		const [org, intent] = finalize.mock.calls[0]!;
		expect(org).toBe(ORG);
		expect(intent.assetId).toBe(assetId);
		expect(intent.key).toBe(`${assetId}/original.jpg`);
		expect(intent.mimeType).toBe('image/jpeg');
	});

	it('rejects a forged ticket', async () => {
		// AES-GCM is authenticated, so tampering fails to decrypt at all.
		const { app, env, finalize } = buildApp();
		const forged = encryptSecret(
			JSON.stringify({
				assetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
				key: 'anything/original.jpg',
				originalFilename: 'x.jpg',
				mimeType: 'image/jpeg',
				organizationId: ORG,
				exp: Date.now() + 60_000
			}),
			'a-completely-different-key-32-characters'
		);

		const res = await post(
			app,
			env,
			'/confirm',
			{ assetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
			{ 'x-upload-ticket': forged }
		);

		expect(res.status).toBe(400);
		expect(finalize).not.toHaveBeenCalled();
	});

	it('rejects an expired ticket', async () => {
		const { app, env, finalize } = buildApp();
		const expired = encryptSecret(
			JSON.stringify({
				assetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
				key: 'a/original.jpg',
				originalFilename: 'x.jpg',
				mimeType: 'image/jpeg',
				organizationId: ORG,
				exp: Date.now() - 1000
			}),
			SECRET
		);

		const res = await post(
			app,
			env,
			'/confirm',
			{ assetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
			{ 'x-upload-ticket': expired }
		);

		expect(res.status).toBe(400);
		expect(finalize).not.toHaveBeenCalled();
	});

	it('rejects a ticket belonging to another organization', async () => {
		// Otherwise a stolen ticket — or a user who switched org mid-flow — could
		// land an asset in an organization that never authorized the upload.
		const { app, env } = buildApp();
		const { assetId, ticket } = await issueTicket(app, env);

		const otherOrg = {
			...env,
			auth: { ...env.auth, organizationId: 'org-b' }
		};
		const res = await post(app, otherOrg, '/confirm', { assetId }, { 'x-upload-ticket': ticket });
		expect(res.status).toBe(403);
	});

	it('rejects a ticket for a different asset id', async () => {
		const { app, env, finalize } = buildApp();
		const { ticket } = await issueTicket(app, env);

		const res = await post(
			app,
			env,
			'/confirm',
			{ assetId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
			{ 'x-upload-ticket': ticket }
		);

		expect(res.status).toBe(400);
		expect(finalize).not.toHaveBeenCalled();
	});

	it('400s with no ticket at all', async () => {
		const { app, env } = buildApp();
		const res = await post(app, env, '/confirm', {
			assetId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
		});
		expect(res.status).toBe(400);
	});

	it('403s without asset.upload even with a valid ticket', async () => {
		// The ticket proves intent, not permission — which can be revoked between
		// issuing and confirming.
		const { app, env } = buildApp();
		const { assetId, ticket } = await issueTicket(app, env);

		const downgraded = { ...env, auth: { ...env.auth, capabilities: ['asset.read'] } };
		const res = await post(app, downgraded, '/confirm', { assetId }, { 'x-upload-ticket': ticket });
		expect(res.status).toBe(403);
	});

	it('reports a missing object as the caller’s fault, not a server error', async () => {
		const finalize = vi.fn(async () => {
			throw new Error('Upload not found in storage');
		});
		const { app, env } = buildApp({ finalize });
		const { assetId, ticket } = await issueTicket(app, env);

		const res = await post(app, env, '/confirm', { assetId }, { 'x-upload-ticket': ticket });
		expect(res.status).toBe(400);
	});
});
