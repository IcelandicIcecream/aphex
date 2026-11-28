import { describe, expect, it } from 'vitest';
import type { CMSInstances } from '../src/lib/hooks';
import type { Auth } from '../src/lib/types/auth';
import type { CMSConfig } from '../src/lib/types/config';
import { createAphexApi } from '../src/lib/server/api/index';
import {
	apiCallKind,
	CallerLimits,
	tooManyCallsMessage
} from '../src/lib/server/api/caller-limits';

const key = (keyId: string, organizationId = 'org-1'): Auth => ({
	type: 'api_key',
	keyId,
	name: 'Claude',
	permissions: ['read', 'write'],
	organizationId
});

describe('caller limits', () => {
	it('counts each key on its own, and says how long to wait', () => {
		const limits = new CallerLimits();
		const config = { agent: { write: 2 } };
		expect(limits.check(key('a'), 'write', config).allowed).toBe(true);
		expect(limits.check(key('a'), 'write', config).allowed).toBe(true);
		const over = limits.check(key('a'), 'write', config);
		expect(over.allowed).toBe(false);
		expect(over.retryAfterSeconds).toBeGreaterThan(0);
		expect(tooManyCallsMessage(over)).toMatch(/^Too many changes at once\. Wait \d+ seconds/);
		// Another app on the same site, and the same app id on another site, aren't held up.
		expect(limits.check(key('b'), 'write', config).allowed).toBe(true);
		expect(limits.check(key('a', 'org-2'), 'write', config).allowed).toBe(true);
		// Nor are its reads.
		expect(limits.check(key('a'), 'read', config).allowed).toBe(true);
	});

	it('gives a signed-in person more room than an agent', () => {
		const limits = new CallerLimits();
		const person: Auth = {
			type: 'session',
			user: { id: 'u1', email: 'a@example.com' },
			session: { id: 's1', expiresAt: new Date(Date.now() + 60_000) },
			organizationId: 'org-1',
			organizationRole: 'owner'
		};
		for (let i = 0; i < 100; i++)
			expect(limits.check(person, 'write', undefined).allowed).toBe(true);
	});

	it('is off with `false`', () => {
		const limits = new CallerLimits();
		for (let i = 0; i < 200; i++)
			expect(limits.check(key('a'), 'upload', false).allowed).toBe(true);
	});

	it('sorts API calls into reads, changes and uploads', () => {
		expect(apiCallKind('GET', '/api/documents')).toBe('read');
		expect(apiCallKind('POST', '/api/documents/query')).toBe('read');
		expect(apiCallKind('POST', '/api/assets')).toBe('upload');
		expect(apiCallKind('POST', '/api/assets/upload-url')).toBe('upload');
		expect(apiCallKind('POST', '/api/assets/confirm')).toBe('write');
		expect(apiCallKind('PUT', '/api/documents/abc')).toBe('write');
		expect(apiCallKind('POST', '/api/documents/abc/publish')).toBe('write');
	});
});

describe('the API over the limit', () => {
	const cms = (rateLimit: CMSConfig['rateLimit']) =>
		({ config: { rateLimit } }) as unknown as CMSInstances;

	it('answers 429 with Retry-After once a key is over', async () => {
		const app = createAphexApi();
		app.get('/probe', (c) => c.json({ ok: true }));
		const env = { aphexCMS: cms({ agent: { read: 1 } }), auth: key('over-http') };
		const first = await app.fetch(new Request('http://x/api/probe'), env);
		expect(first.status).toBe(200);
		const second = await app.fetch(new Request('http://x/api/probe'), env);
		expect(second.status).toBe(429);
		expect(Number(second.headers.get('retry-after'))).toBeGreaterThan(0);
		expect(await second.json()).toMatchObject({ success: false, error: 'Too many requests' });
	});

	it('leaves anonymous calls to their own limits', async () => {
		const app = createAphexApi();
		app.get('/probe', (c) => c.json({ ok: true }));
		const env = { aphexCMS: cms({ agent: { read: 0 }, session: { read: 0 } }), auth: null };
		expect((await app.fetch(new Request('http://x/api/probe'), env)).status).toBe(200);
	});
});
