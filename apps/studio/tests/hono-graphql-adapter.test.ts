import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { toHonoHandler, createAphexApi } from '@aphexcms/cms-core/server/api/index';
import type { AphexEnv } from '@aphexcms/cms-core/server/api/index';

/**
 * Phase 6 gate — verifies the SK→Hono adapter that lets us mount the
 * existing GraphQL `RequestHandler` on the Hono app without rewriting it.
 *
 * The adapter is generic; we don't load Yoga in tests. Instead we feed
 * a hand-rolled fake SK handler and assert the synthesized event shape
 * gets passed through correctly.
 */

describe('toHonoHandler — SvelteKit handler adapter', () => {
	it('synthesizes event.request from c.req.raw', async () => {
		const skHandler = vi.fn(async (event: any) => {
			return new Response(`got method ${event.request.method}`);
		});
		const app = new Hono<AphexEnv>();
		app.use('*', async (c, next) => {
			c.set('aphexCMS', c.env.aphexCMS);
			c.set('auth', c.env.auth);
			await next();
		});
		app.all('/wrapped', toHonoHandler(skHandler));

		const res = await app.fetch(new Request('http://localhost/wrapped', { method: 'POST' }), {
			aphexCMS: null,
			auth: null
		} as any);
		expect(res.status).toBe(200);
		expect(await res.text()).toBe('got method POST');
		expect(skHandler).toHaveBeenCalledOnce();
	});

	it('synthesizes event.locals.aphexCMS and .auth from c.var', async () => {
		const skHandler = vi.fn(async (event: any) => {
			return Response.json({
				cms: event.locals.aphexCMS,
				auth: event.locals.auth
			});
		});
		const app = new Hono<AphexEnv>();
		app.use('*', async (c, next) => {
			c.set('aphexCMS', c.env.aphexCMS);
			c.set('auth', c.env.auth);
			await next();
		});
		app.all('/wrapped', toHonoHandler(skHandler));

		const fakeCMS = { marker: 'cms' } as any;
		const fakeAuth = { marker: 'auth' } as any;

		const res = await app.fetch(new Request('http://localhost/wrapped'), {
			aphexCMS: fakeCMS,
			auth: fakeAuth
		});
		const body = await res.json();
		expect(body.cms).toEqual({ marker: 'cms' });
		expect(body.auth).toEqual({ marker: 'auth' });
	});

	it('synthesizes event.url and event.params', async () => {
		const skHandler = vi.fn(async (event: any) => {
			return Response.json({
				href: event.url.href,
				pathname: event.url.pathname,
				params: event.params
			});
		});
		const app = new Hono<AphexEnv>();
		app.use('*', async (c, next) => {
			c.set('aphexCMS', c.env.aphexCMS);
			c.set('auth', c.env.auth);
			await next();
		});
		app.all('/wrapped/:id', toHonoHandler(skHandler));

		const res = await app.fetch(new Request('http://localhost/wrapped/abc?q=1'), {
			aphexCMS: null,
			auth: null
		} as any);
		const body = await res.json();
		expect(body.pathname).toBe('/wrapped/abc');
		expect(body.params).toEqual({ id: 'abc' });
	});

	it('returns the response from the wrapped handler verbatim', async () => {
		const skHandler = async () =>
			new Response(JSON.stringify({ ok: true }), {
				status: 418,
				headers: { 'content-type': 'application/json', 'x-custom': 'yes' }
			});

		const app = new Hono<AphexEnv>();
		app.use('*', async (c, next) => {
			c.set('aphexCMS', c.env.aphexCMS);
			c.set('auth', c.env.auth);
			await next();
		});
		app.all('/wrapped', toHonoHandler(skHandler));

		const res = await app.fetch(new Request('http://localhost/wrapped'), {
			aphexCMS: null,
			auth: null
		} as any);
		expect(res.status).toBe(418);
		expect(res.headers.get('x-custom')).toBe('yes');
		expect(await res.json()).toEqual({ ok: true });
	});
});

describe('createAphexApi — public surface unchanged after Phase 6 strip', () => {
	it('still returns a Hono app with /api basePath', async () => {
		const app = createAphexApi();
		// Empty unknown route should 404, not throw.
		const res = await app.fetch(new Request('http://localhost/api/__nope__'), {
			aphexCMS: null,
			auth: null
		} as any);
		expect(res.status).toBe(404);
	});
});
