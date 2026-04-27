import { describe, it, expect } from 'vitest';
import { createAphexApi } from '@aphexcms/cms-core/server/api/index';

/**
 * Phase 0 gate: verifies the Aphex Hono app boots, the bridge middleware
 * lifts `c.env` onto `c.var`, and unmatched paths return Hono's 404
 * (not SvelteKit's HTML error page).
 *
 * This test exercises the Hono app directly via `app.fetch()` — no
 * SvelteKit hook, no dev server. Proves the proposal's "end-to-end
 * testable without SvelteKit" claim.
 */
describe('Hono catch-all — Phase 0', () => {
	it('boots an empty app and returns 404 for unmatched paths', async () => {
		const app = createAphexApi();
		const res = await app.fetch(
			new Request('http://localhost/api/__nope__'),
			// @ts-expect-error — env type wants real CMSInstances; Phase 0
			// test only exercises plumbing, no handler reads from it.
			{ aphexCMS: null, auth: null }
		);
		expect(res.status).toBe(404);
	});

	it('forwards aphexCMS + auth from env to c.var via bridge middleware', async () => {
		const app = createAphexApi();
		// Mark a probe route. The handler reads c.var.aphexCMS / c.var.auth and
		// echoes back what arrived — proves the bridge middleware works.
		app.get('/__probe__', (c) => {
			return c.json({
				aphexCMS: c.var.aphexCMS,
				auth: c.var.auth
			});
		});

		const fakeCMS = { marker: 'cms-here' } as any;
		const fakeAuth = { marker: 'auth-here' } as any;

		const res = await app.fetch(new Request('http://localhost/api/__probe__'), {
			aphexCMS: fakeCMS,
			auth: fakeAuth
		});
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.aphexCMS).toEqual({ marker: 'cms-here' });
		expect(body.auth).toEqual({ marker: 'auth-here' });
	});

	it('forwards request body and method correctly', async () => {
		const app = createAphexApi();
		app.post('/__echo__', async (c) => {
			const body = await c.req.json();
			return c.json({ method: c.req.method, body });
		});

		const res = await app.fetch(
			new Request('http://localhost/api/__echo__', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ hello: 'world' })
			}),
			{ aphexCMS: null as any, auth: null }
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.method).toBe('POST');
		expect(body.body).toEqual({ hello: 'world' });
	});

	it('config.api hook: routes registered there are reachable', async () => {
		// Simulates how `aphex.config.ts` will register custom endpoints:
		// build the app, then call `config.api?.(app)`.
		const app = createAphexApi();
		const userApi = (a: typeof app) => {
			a.get('/hello', (c) => c.json({ hello: 'world' }));
		};
		userApi(app);

		const res = await app.fetch(new Request('http://localhost/api/hello'), {
			aphexCMS: null as any,
			auth: null
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ hello: 'world' });
	});
});
