/**
 * `/api/docs` is the one route in the OpenAPI pipeline that is not data — it is
 * an HTML page, same-origin with the admin, that loads a third-party script and
 * hands it the caller's session. That makes three properties load-bearing rather
 * than cosmetic, so they are tested rather than reviewed:
 *
 * 1. The script it loads is pinned by version *and* by hash.
 * 2. An anonymous caller never reaches it.
 * 3. An instance that turned it off doesn't serve it.
 */
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { openapiDocsRouter } from '../src/lib/server/api/routes/openapi';
import type { AphexEnv } from '../src/lib/server/api/index';

type DocsConfig = {
	openapi?: { docsUi?: boolean };
	auth?: { loginUrl?: string };
};

function docsApp(config: DocsConfig, auth: unknown = { type: 'session' }) {
	const app = new Hono<AphexEnv>().basePath('/api');
	app.use('*', async (c, next) => {
		c.set('aphexCMS', c.env.aphexCMS);
		c.set('auth', c.env.auth);
		await next();
	});
	app.route('/docs', openapiDocsRouter);

	return (req = 'http://localhost/api/docs') =>
		app.fetch(new Request(req), {
			aphexCMS: { cmsEngine: { config } },
			auth
		} as never);
}

describe('GET /api/docs', () => {
	it('pins the Scalar build by version and integrity hash', async () => {
		const res = await docsApp({ openapi: { docsUi: true } })();
		const html = await res.text();

		// An unpinned CDN specifier lets a third party change what executes on the
		// admin origin without anyone here deciding to upgrade, and the page runs
		// with the signed-in user's cookies.
		expect(html).toMatch(/@scalar\/api-reference@\d+\.\d+\.\d+/);
		expect(html).toContain('integrity="sha384-');
		// SRI is only enforced on a cross-origin script when the request is made
		// in CORS mode; without this the hash is decorative.
		expect(html).toContain('crossorigin="anonymous"');
	});

	it('redirects an anonymous caller to the login page', async () => {
		const res = await docsApp({ openapi: { docsUi: true } }, null)();
		expect(res.status).toBe(302);
		expect(res.headers.get('location')).toBe('/login');
	});

	it('redirects to the configured login page when one is set', async () => {
		const res = await docsApp(
			{ openapi: { docsUi: true }, auth: { loginUrl: '/admin/sign-in' } },
			null
		)();
		expect(res.headers.get('location')).toBe('/admin/sign-in');
	});

	it('is mounted by default, with no configuration', async () => {
		const res = await docsApp({})();
		expect(res.status).toBe(200);
	});

	it('unmounts when the instance opts out', async () => {
		const res = await docsApp({ openapi: { docsUi: false } })();
		// 404 rather than 403: an instance that turned the page off should look
		// like one that never had it.
		expect(res.status).toBe(404);
	});

	it('checks the mount before the session, so an opted-out instance leaks nothing', async () => {
		// A redirect to /login would confirm to an anonymous prober that something
		// answers here; a 404 says nothing.
		const res = await docsApp({ openapi: { docsUi: false } }, null)();
		expect(res.status).toBe(404);
	});
});
