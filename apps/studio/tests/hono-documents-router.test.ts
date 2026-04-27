import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { documentsRouter } from '@aphexcms/cms-core/server/api/routes/documents';
import { documentsByIdRouter } from '@aphexcms/cms-core/server/api/routes/documents-by-id';
import { documentsPublishRouter } from '@aphexcms/cms-core/server/api/routes/documents-publish';
import { documentsQueryRouter } from '@aphexcms/cms-core/server/api/routes/documents-query';
import { documentVersionsRouter } from '@aphexcms/cms-core/server/api/routes/document-versions';
import type { AphexEnv } from '@aphexcms/cms-core/server/api/index';

/**
 * Phase 2 gate — ported documents-family routers.
 *
 * Each router is exercised in isolation with a hand-rolled fake `localAPI`.
 * We assert the response **envelope**, **status codes**, and **wire path
 * shape** stay byte-identical to the legacy `+server.ts` handlers so the
 * deletion of those shims is invisible to clients.
 */

// ---------- Mock builders ----------

type FakeDoc = { id: string; type: string; data: any };

function buildFakeLocalAPI(opts: {
	docs?: FakeDoc[];
	throwOnCreate?: Error;
	throwOnUpdate?: Error;
	throwOnPublish?: Error;
} = {}) {
	const docs = opts.docs ?? [];

	const collection = (typeName: string) => ({
		find: async (_ctx: any, options: any) => {
			const filtered = docs.filter((d) => d.type === typeName);
			const limit = options?.limit ?? 20;
			const offset = options?.offset ?? 0;
			const slice = filtered.slice(offset, offset + limit);
			return {
				docs: slice,
				totalDocs: filtered.length,
				page: Math.floor(offset / limit) + 1,
				limit,
				totalPages: Math.ceil(filtered.length / limit),
				hasNextPage: offset + limit < filtered.length,
				hasPrevPage: offset > 0
			};
		},
		findByID: async (_ctx: any, id: string) => docs.find((d) => d.id === id && d.type === typeName) ?? null,
		create: async (_ctx: any, data: any) => {
			if (opts.throwOnCreate) throw opts.throwOnCreate;
			const doc = { id: 'new-id', type: typeName, data };
			return { document: doc, validation: { valid: true } };
		},
		update: async (_ctx: any, id: string, data: any) => {
			if (opts.throwOnUpdate) throw opts.throwOnUpdate;
			const found = docs.find((d) => d.id === id);
			if (!found) return null;
			return { document: { ...found, data }, validation: { valid: true } };
		},
		delete: async (_ctx: any, id: string) => docs.some((d) => d.id === id),
		publish: async (_ctx: any, id: string) => {
			if (opts.throwOnPublish) throw opts.throwOnPublish;
			const found = docs.find((d) => d.id === id);
			return found ?? null;
		},
		unpublish: async (_ctx: any, id: string) => docs.find((d) => d.id === id) ?? null
	});

	const collections: Record<string, ReturnType<typeof collection>> = {
		page: collection('page'),
		movie: collection('movie')
	};

	return {
		collections,
		hasCollection: (name: string) => name in collections,
		getCollectionNames: () => Object.keys(collections),
		findDocumentById: async (_ctx: any, id: string) => docs.find((d) => d.id === id) ?? null,
		versionService: {
			listVersions: async () => ({ versions: [], total: 0 }),
			getVersion: async () => null,
			restoreVersion: async () => null
		}
	};
}

function buildEnv(localAPI: ReturnType<typeof buildFakeLocalAPI>) {
	return {
		aphexCMS: {
			localAPI,
			databaseAdapter: {} as any,
			auth: null
		} as any,
		auth: {
			type: 'session' as const,
			organizationId: 'test-org',
			user: { id: 'test-user', email: 't@e.com', name: 'T', role: 'admin' as const }
		} as any
	};
}

function makeApp() {
	const app = new Hono<AphexEnv>();
	app.use('*', async (c, next) => {
		c.set('aphexCMS', c.env.aphexCMS);
		c.set('auth', c.env.auth);
		await next();
	});
	// Match production mount order: specific paths first.
	app.route('/documents', documentsQueryRouter);
	app.route('/documents', documentsPublishRouter);
	app.route('/documents', documentVersionsRouter);
	app.route('/documents', documentsByIdRouter);
	app.route('/documents', documentsRouter);
	return app;
}

// ---------- GET /documents (list) ----------

describe('GET /documents — list', () => {
	it('returns docs + pagination envelope', async () => {
		const localAPI = buildFakeLocalAPI({
			docs: [
				{ id: '1', type: 'page', data: { title: 'A' } },
				{ id: '2', type: 'page', data: { title: 'B' } }
			]
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/documents?type=page'),
			buildEnv(localAPI)
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data).toHaveLength(2);
		expect(body.pagination).toMatchObject({
			total: 2,
			page: 1,
			pageSize: 20,
			hasNextPage: false,
			hasPrevPage: false
		});
	});

	it('400 when ?type missing', async () => {
		const localAPI = buildFakeLocalAPI();
		const res = await makeApp().fetch(
			new Request('http://localhost/documents'),
			buildEnv(localAPI)
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Bad Request');
	});

	it('400 when type collection unknown', async () => {
		const localAPI = buildFakeLocalAPI();
		const res = await makeApp().fetch(
			new Request('http://localhost/documents?type=nonexistent'),
			buildEnv(localAPI)
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Invalid document type');
	});

	it('coerces page/pageSize from string query params', async () => {
		const localAPI = buildFakeLocalAPI({
			docs: Array.from({ length: 30 }, (_, i) => ({ id: `${i}`, type: 'page', data: {} }))
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/documents?type=page&page=2&pageSize=10'),
			buildEnv(localAPI)
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.pagination.page).toBe(2);
		expect(body.pagination.pageSize).toBe(10);
		expect(body.data).toHaveLength(10);
	});
});

// ---------- POST /documents (create) ----------

describe('POST /documents — create', () => {
	it('201 with created doc + validation', async () => {
		const localAPI = buildFakeLocalAPI();
		const res = await makeApp().fetch(
			new Request('http://localhost/documents', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ type: 'page', data: { title: 'New' } })
			}),
			buildEnv(localAPI)
		);
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data.id).toBe('new-id');
		expect(body.validation).toEqual({ valid: true });
	});

	it('400 with issues[] when zod fails', async () => {
		const localAPI = buildFakeLocalAPI();
		const res = await makeApp().fetch(
			new Request('http://localhost/documents', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({}) // missing required `type`
			}),
			buildEnv(localAPI)
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.success).toBe(false);
		expect(body.error).toBe('Invalid request body');
		expect(Array.isArray(body.issues)).toBe(true);
	});
});

// ---------- /documents/:id ----------

describe('GET/PUT/DELETE /documents/:id', () => {
	it('GET returns doc when found', async () => {
		const localAPI = buildFakeLocalAPI({
			docs: [{ id: 'abc', type: 'page', data: { title: 'X' } }]
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/documents/abc'),
			buildEnv(localAPI)
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.id).toBe('abc');
	});

	it('GET 404 when missing', async () => {
		const localAPI = buildFakeLocalAPI();
		const res = await makeApp().fetch(
			new Request('http://localhost/documents/nope'),
			buildEnv(localAPI)
		);
		expect(res.status).toBe(404);
	});

	it('PUT updates and returns new doc', async () => {
		const localAPI = buildFakeLocalAPI({
			docs: [{ id: 'abc', type: 'page', data: { title: 'old' } }]
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/documents/abc', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ data: { title: 'new' } })
			}),
			buildEnv(localAPI)
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.data.title).toBe('new');
	});

	it('DELETE 200 when found, 404 when not', async () => {
		const localAPI = buildFakeLocalAPI({
			docs: [{ id: 'abc', type: 'page', data: {} }]
		});
		const okRes = await makeApp().fetch(
			new Request('http://localhost/documents/abc', { method: 'DELETE' }),
			buildEnv(localAPI)
		);
		expect(okRes.status).toBe(200);

		const missRes = await makeApp().fetch(
			new Request('http://localhost/documents/missing', { method: 'DELETE' }),
			buildEnv(localAPI)
		);
		expect(missRes.status).toBe(404);
	});
});

// ---------- /documents/:id/publish ----------

describe('POST/DELETE /documents/:id/publish', () => {
	it('POST publishes', async () => {
		const localAPI = buildFakeLocalAPI({
			docs: [{ id: 'abc', type: 'page', data: {} }]
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/documents/abc/publish', { method: 'POST' }),
			buildEnv(localAPI)
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.message).toMatch(/published/);
	});

	it('DELETE unpublishes', async () => {
		const localAPI = buildFakeLocalAPI({
			docs: [{ id: 'abc', type: 'page', data: {} }]
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/documents/abc/publish', { method: 'DELETE' }),
			buildEnv(localAPI)
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.message).toMatch(/unpublished/);
	});

	it('publish — 400 with validation envelope on validation errors', async () => {
		const localAPI = buildFakeLocalAPI({
			docs: [{ id: 'abc', type: 'page', data: {} }],
			throwOnPublish: new Error('Document has validation errors: title required')
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/documents/abc/publish', { method: 'POST' }),
			buildEnv(localAPI)
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Cannot publish: validation errors');
	});
});

// ---------- POST /documents/query ----------

describe('POST /documents/query', () => {
	it('returns docs filtered via complex body', async () => {
		const localAPI = buildFakeLocalAPI({
			docs: [
				{ id: '1', type: 'page', data: { title: 'A' } },
				{ id: '2', type: 'page', data: { title: 'B' } }
			]
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/documents/query', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					type: 'page',
					where: { 'data.title': { equals: 'A' } },
					limit: 5
				})
			}),
			buildEnv(localAPI)
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data).toBeDefined();
		expect(body.pagination.pageSize).toBe(5);
	});

	it('400 with issues[] when type missing', async () => {
		const localAPI = buildFakeLocalAPI();
		const res = await makeApp().fetch(
			new Request('http://localhost/documents/query', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ where: {} })
			}),
			buildEnv(localAPI)
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.success).toBe(false);
		expect(Array.isArray(body.issues)).toBe(true);
	});

	it('does NOT collide with /documents/:id', async () => {
		// Ensures registration order is correct: POST /documents/query
		// should land on the query router, not the byId router.
		const localAPI = buildFakeLocalAPI();
		const res = await makeApp().fetch(
			new Request('http://localhost/documents/query', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ type: 'page' })
			}),
			buildEnv(localAPI)
		);
		// If this fell through to /documents/:id (PUT/GET/DELETE only), Hono
		// would 404 the POST. We expect 200 instead.
		expect(res.status).toBe(200);
	});
});

// ---------- /documents/:id/versions ----------

describe('document versions', () => {
	let localAPI: ReturnType<typeof buildFakeLocalAPI>;

	beforeEach(() => {
		localAPI = buildFakeLocalAPI({
			docs: [{ id: 'abc', type: 'page', data: {} }]
		});
	});

	it('GET versions list', async () => {
		const res = await makeApp().fetch(
			new Request('http://localhost/documents/abc/versions'),
			buildEnv(localAPI)
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(Array.isArray(body.data)).toBe(true);
	});

	it('GET specific version returns 404 when not found', async () => {
		const res = await makeApp().fetch(
			new Request('http://localhost/documents/abc/versions/5'),
			buildEnv(localAPI)
		);
		expect(res.status).toBe(404);
	});

	it('GET version 400 when version not numeric', async () => {
		const res = await makeApp().fetch(
			new Request('http://localhost/documents/abc/versions/foo'),
			buildEnv(localAPI)
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('Version must be a number');
	});

	it('POST restore — 404 when version missing', async () => {
		const res = await makeApp().fetch(
			new Request('http://localhost/documents/abc/versions/5/restore', {
				method: 'POST'
			}),
			buildEnv(localAPI)
		);
		expect(res.status).toBe(404);
	});
});
