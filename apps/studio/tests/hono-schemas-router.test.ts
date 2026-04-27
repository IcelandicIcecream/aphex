import { describe, it, expect } from 'vitest';
import { schemasRouter } from '@aphexcms/cms-core/server/api/routes/schemas';
import { Hono } from 'hono';
import type { AphexEnv } from '@aphexcms/cms-core/server/api/index';

/**
 * Phase 1 gate: the ported `schemas` router responds with the same
 * envelope shape as the legacy `+server.ts` (`{ success: true, data }`
 * for hits, `{ error }` with status for misses).
 *
 * Mounted on a fresh empty parent so we test the router in isolation
 * without booting the full CMS.
 */
describe('Hono schemas router — Phase 1 port', () => {
	const fakeSchemaTypes = [
		{ name: 'page', type: 'document', title: 'Page', fields: [] },
		{ name: 'movie', type: 'document', title: 'Movie', fields: [] }
	];

	function makeApp() {
		const app = new Hono<AphexEnv>();
		// Bridge env → var (mirrors what createAphexApi() does).
		app.use('*', async (c, next) => {
			c.set('aphexCMS', c.env.aphexCMS);
			c.set('auth', c.env.auth);
			await next();
		});
		app.route('/schemas', schemasRouter);
		return app;
	}

	const fakeEnv = {
		aphexCMS: {
			cmsEngine: {
				config: { schemaTypes: fakeSchemaTypes },
				getSchemaTypeByName(name: string) {
					return fakeSchemaTypes.find((s) => s.name === name);
				}
			}
		} as any,
		auth: null
	};

	it('GET /schemas returns the full schema list', async () => {
		const app = makeApp();
		const res = await app.fetch(new Request('http://localhost/schemas'), fakeEnv);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data).toHaveLength(2);
		expect(body.data[0].name).toBe('page');
	});

	it('GET /schemas/:type returns the matching schema', async () => {
		const app = makeApp();
		const res = await app.fetch(new Request('http://localhost/schemas/page'), fakeEnv);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.name).toBe('page');
	});

	it('GET /schemas/:type returns 404 for unknown type', async () => {
		const app = makeApp();
		const res = await app.fetch(new Request('http://localhost/schemas/__nope__'), fakeEnv);
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toContain("'__nope__'");
	});
});
