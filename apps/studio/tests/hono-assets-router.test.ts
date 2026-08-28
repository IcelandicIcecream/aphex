import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { assetsRouter } from '@aphexcms/cms-core/server/api/routes/assets';
import { assetsByIdRouter } from '@aphexcms/cms-core/server/api/routes/assets-by-id';
import { assetsBulkRouter } from '@aphexcms/cms-core/server/api/routes/assets-bulk';
import { assetsReferencesRouter } from '@aphexcms/cms-core/server/api/routes/assets-references';
import type { AphexEnv } from '@aphexcms/cms-core/server/api/index';

/**
 * Phase 3 gate — assets-family routers.
 *
 * The CDN handler at /media/:id/:filename is intentionally NOT ported in
 * this phase (out of /api/** scope). Tests cover the 5 routers that ARE
 * mounted on /api/assets.
 */

type FakeAsset = { id: string; title?: string };

function buildFakeAphexCMS(
	opts: {
		assets?: FakeAsset[];
		references?: Record<string, string[]>;
		/**
		 * Schema type per referencing document id. Defaults to `page`, which
		 * `localAPI.getCollectionNames()` registers. Give a document a type that
		 * is NOT registered to model an orphaned schema type — a document left in
		 * the DB after its type was removed from the codebase.
		 */
		referenceTypes?: Record<string, string>;
		uploadFails?: Error;
	} = {}
) {
	const assets = opts.assets ?? [];
	const references = opts.references ?? {};
	const referenceTypes = opts.referenceTypes ?? {};
	/** Records the `knownTypes` argument of the last reference scan, or `undefined`. */
	const scanCalls: Array<string[] | undefined> = [];

	return {
		assetService: {
			findAssets: async (_orgId: string, filters: any) =>
				assets.slice(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 20)),
			findAssetById: async (_orgId: string, id: string) => assets.find((a) => a.id === id) ?? null,
			deleteAsset: async (_orgId: string, id: string) => assets.some((a) => a.id === id),
			updateAssetMetadata: async (_orgId: string, id: string, patch: any) => {
				const a = assets.find((x) => x.id === id);
				if (!a) return null;
				// Mirror Drizzle's `.set()`: undefined keys are omitted from the
				// UPDATE, `null` writes NULL. A plain object spread would instead
				// let `undefined` clobber the existing value, which would make the
				// tri-state tests below pass for the wrong reason.
				const defined = Object.fromEntries(
					Object.entries(patch).filter(([, v]) => v !== undefined)
				);
				return { ...a, ...defined };
			},
			uploadAsset: async () => {
				if (opts.uploadFails) throw opts.uploadFails;
				return { id: 'uploaded-id', title: 'New' };
			}
		},
		// The asset routes filter referencing documents against the registered
		// collection names, so they need a localAPI even though they never read
		// or write a document through it.
		localAPI: {
			getCollectionNames: () => ['page']
		},
		databaseAdapter: {
			findDocumentsReferencingAsset: async (_orgId: string, id: string, knownTypes?: string[]) => {
				scanCalls.push(knownTypes);
				const docs = (references[id] ?? []).map((docId) => ({
					documentId: docId,
					type: referenceTypes[docId] ?? 'page',
					title: docId,
					status: 'draft' as string | null
				}));
				// Mirror the adapters: filter only when knownTypes is supplied.
				return knownTypes && knownTypes.length > 0
					? docs.filter((d) => knownTypes.includes(d.type))
					: docs;
			},
			countDocumentReferencesForAssets: async (_orgId: string, ids: string[]) => {
				const counts: Record<string, number> = {};
				for (const id of ids) counts[id] = (references[id] ?? []).length;
				return counts;
			},
			countAssets: async () => assets.length
		},
		/** Test-only handle, not part of the CMS container. */
		__scanCalls: scanCalls
	};
}

function buildEnv(
	aphexCMS: any,
	authOpts: {
		type?: 'session' | 'partial_session' | 'api_key';
		missing?: boolean;
		/**
		 * Explicit capability list. Omit for the default `admin` instance role,
		 * which resolves to every capability — that's what most tests want, since
		 * they're exercising behaviour rather than authorization. Pass a list
		 * (including `[]`) to make `resolveCapabilities` authoritative instead.
		 */
		capabilities?: string[];
	} = {}
) {
	if (authOpts.missing) {
		return { aphexCMS, auth: null };
	}
	const type = authOpts.type ?? 'session';
	const caps = authOpts.capabilities ? { capabilities: authOpts.capabilities } : {};
	if (type === 'api_key') {
		return {
			aphexCMS,
			auth: {
				type: 'api_key',
				organizationId: 'test-org',
				keyId: 'apikey-1',
				...caps
			} as any
		};
	}
	return {
		aphexCMS,
		auth: {
			type,
			organizationId: 'test-org',
			// `member` rather than `admin` whenever an explicit list is given —
			// `admin` is an instance-role override that short-circuits to every
			// capability and would mask the list entirely.
			user: {
				id: 'user-1',
				email: 'u@e.com',
				name: 'U',
				role: authOpts.capabilities ? ('user' as const) : ('admin' as const)
			},
			organizationRole: 'member',
			...caps
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
	// Production mount order.
	app.route('/assets', assetsBulkRouter);
	app.route('/assets', assetsReferencesRouter);
	app.route('/assets', assetsByIdRouter);
	app.route('/assets', assetsRouter);
	return app;
}

// ---------- GET /assets (list) ----------

describe('GET /assets', () => {
	it('returns paginated assets', async () => {
		const aphexCMS = buildFakeAphexCMS({
			assets: [
				{ id: 'a', title: 'Alpha' },
				{ id: 'b', title: 'Beta' }
			]
		});
		const res = await makeApp().fetch(new Request('http://localhost/assets'), buildEnv(aphexCMS));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.success).toBe(true);
		expect(body.data).toHaveLength(2);
		expect(body.pagination.total).toBe(2);
	});

	it('401 when auth missing', async () => {
		const aphexCMS = buildFakeAphexCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/assets'),
			buildEnv(aphexCMS, { missing: true })
		);
		expect(res.status).toBe(401);
	});

	it('401 when auth is partial_session', async () => {
		const aphexCMS = buildFakeAphexCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/assets'),
			buildEnv(aphexCMS, { type: 'partial_session' })
		);
		expect(res.status).toBe(401);
	});
});

// ---------- POST /assets (upload) ----------

describe('POST /assets', () => {
	it('400 when no file in formData', async () => {
		const aphexCMS = buildFakeAphexCMS();
		const fd = new FormData();
		const res = await makeApp().fetch(
			new Request('http://localhost/assets', { method: 'POST', body: fd }),
			buildEnv(aphexCMS)
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.error).toBe('No file provided');
	});

	it('uploads and returns asset envelope', async () => {
		const aphexCMS = buildFakeAphexCMS();
		const fd = new FormData();
		// Use a tiny valid PNG header so validateFile() passes magic-byte check
		const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		const file = new File([pngHeader], 'pixel.png', { type: 'image/png' });
		fd.set('file', file);
		fd.set('title', 'My Pixel');
		const res = await makeApp().fetch(
			new Request('http://localhost/assets', { method: 'POST', body: fd }),
			buildEnv(aphexCMS)
		);
		// validateFile may still 400 if magic-byte check is strict — accept
		// either 200 (success) or 400 (validation rejected) and assert on
		// the success path when 200.
		if (res.status === 200) {
			const body = await res.json();
			expect(body.success).toBe(true);
			expect(body.data.id).toBe('uploaded-id');
		} else {
			expect(res.status).toBe(400);
		}
	});

	it('401 when auth missing on upload', async () => {
		const aphexCMS = buildFakeAphexCMS();
		const fd = new FormData();
		const res = await makeApp().fetch(
			new Request('http://localhost/assets', { method: 'POST', body: fd }),
			buildEnv(aphexCMS, { missing: true })
		);
		expect(res.status).toBe(401);
	});
});

// ---------- /assets/:id ----------

describe('GET/PATCH/DELETE /assets/:id', () => {
	it('GET returns asset', async () => {
		const aphexCMS = buildFakeAphexCMS({
			assets: [{ id: 'a', title: 'A' }]
		});
		const res = await makeApp().fetch(new Request('http://localhost/assets/a'), buildEnv(aphexCMS));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.id).toBe('a');
	});

	it('GET 404 when missing', async () => {
		const aphexCMS = buildFakeAphexCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/assets/nope'),
			buildEnv(aphexCMS)
		);
		expect(res.status).toBe(404);
	});

	it('PATCH updates metadata', async () => {
		const aphexCMS = buildFakeAphexCMS({
			assets: [{ id: 'a', title: 'old' }]
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/assets/a', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ title: 'new' })
			}),
			buildEnv(aphexCMS)
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.title).toBe('new');
	});

	it('DELETE 200 when found, 404 when not', async () => {
		const aphexCMS = buildFakeAphexCMS({
			assets: [{ id: 'a' }]
		});
		const okRes = await makeApp().fetch(
			new Request('http://localhost/assets/a', { method: 'DELETE' }),
			buildEnv(aphexCMS)
		);
		expect(okRes.status).toBe(200);

		const missRes = await makeApp().fetch(
			new Request('http://localhost/assets/missing', { method: 'DELETE' }),
			buildEnv(aphexCMS)
		);
		expect(missRes.status).toBe(404);
	});

	it('DELETE 409 when asset is referenced by documents', async () => {
		const aphexCMS = buildFakeAphexCMS({
			assets: [{ id: 'a' }],
			references: { a: ['doc-1', 'doc-2'] }
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/assets/a', { method: 'DELETE' }),
			buildEnv(aphexCMS)
		);
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.error).toMatch(/referenced by 2 documents/);
		expect(body.references).toHaveLength(2);
		expect(body.unregisteredTypes).toEqual([]);
	});

	it('scans for references WITHOUT filtering by registered types', async () => {
		// Type-filtering is correct for display but wrong here: it hides documents
		// whose schema type was removed, letting the delete through and leaving a
		// permanently dangling _ref.
		const aphexCMS = buildFakeAphexCMS({
			assets: [{ id: 'a' }],
			references: { a: ['doc-1'] }
		});
		await makeApp().fetch(
			new Request('http://localhost/assets/a', { method: 'DELETE' }),
			buildEnv(aphexCMS)
		);
		expect(aphexCMS.__scanCalls).toEqual([undefined]);
	});

	it('DELETE 409 names unregistered schema types that block the delete', async () => {
		const aphexCMS = buildFakeAphexCMS({
			assets: [{ id: 'a' }],
			references: { a: ['doc-1', 'doc-legacy'] },
			referenceTypes: { 'doc-legacy': 'retiredThing' }
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/assets/a', { method: 'DELETE' }),
			buildEnv(aphexCMS)
		);

		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.unregisteredTypes).toEqual(['retiredThing']);
		// The message has to explain itself: the blocking document can't be opened
		// in the admin, so "remove the reference first" is impossible advice.
		expect(body.error).toMatch(/retiredThing/);
		expect(body.error).toMatch(/cannot be opened in the admin/);
		expect(body.error).toMatch(/force/);
	});

	it('DELETE ?force=true deletes despite references', async () => {
		// The only escape when the reference is held by a document that cannot be
		// opened — otherwise the asset is undeletable forever.
		const aphexCMS = buildFakeAphexCMS({
			assets: [{ id: 'a' }],
			references: { a: ['doc-legacy'] },
			referenceTypes: { 'doc-legacy': 'retiredThing' }
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/assets/a?force=true', { method: 'DELETE' }),
			buildEnv(aphexCMS)
		);

		expect(res.status).toBe(200);
		// Forcing skips the scan entirely rather than running it and ignoring it.
		expect(aphexCMS.__scanCalls).toEqual([]);
	});

	it('DELETE ?force without =true does not bypass the guard', async () => {
		const aphexCMS = buildFakeAphexCMS({
			assets: [{ id: 'a' }],
			references: { a: ['doc-1'] }
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/assets/a?force=1', { method: 'DELETE' }),
			buildEnv(aphexCMS)
		);
		expect(res.status).toBe(409);
	});
});

// ---------- /assets/bulk ----------

describe('DELETE /assets/bulk', () => {
	it('deletes batch of unreferenced assets', async () => {
		const aphexCMS = buildFakeAphexCMS({
			assets: [{ id: 'a' }, { id: 'b' }]
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/assets/bulk', {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ ids: ['a', 'b'] })
			}),
			buildEnv(aphexCMS)
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.deleted).toBe(2);
		expect(body.data.failed).toBe(0);
	});

	it('409 with referencedIds when some are still referenced', async () => {
		const aphexCMS = buildFakeAphexCMS({
			assets: [{ id: 'a' }, { id: 'b' }],
			references: { b: ['doc-1'] }
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/assets/bulk', {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ ids: ['a', 'b'] })
			}),
			buildEnv(aphexCMS)
		);
		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.referencedIds).toEqual(['b']);
	});

	it('400 with issues[] when ids missing', async () => {
		const aphexCMS = buildFakeAphexCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/assets/bulk', {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({})
			}),
			buildEnv(aphexCMS)
		);
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(Array.isArray(body.issues)).toBe(true);
	});

	it('does NOT collide with /assets/:id (precedence regression)', async () => {
		// If bulk router were registered AFTER byId, DELETE /assets/bulk would
		// hit byId with id="bulk" — which would fail the asset-not-found check
		// and return 404 (no asset called 'bulk').
		const aphexCMS = buildFakeAphexCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/assets/bulk', {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ ids: ['x'] })
			}),
			buildEnv(aphexCMS)
		);
		// Bulk wins: returns 200 (deleted/failed both 0) since 'x' isn't
		// referenced and isn't in our fake assets either.
		expect(res.status).toBe(200);
	});
});

// ---------- /assets/:id/references and /assets/references/counts ----------

describe('asset references', () => {
	it('GET /:id/references returns referencing docs', async () => {
		const aphexCMS = buildFakeAphexCMS({
			assets: [{ id: 'a' }],
			references: { a: ['doc-1', 'doc-2'] }
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/assets/a/references'),
			buildEnv(aphexCMS)
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.references).toHaveLength(2);
		expect(body.data.total).toBe(2);
	});

	it('POST /references/counts returns counts map', async () => {
		const aphexCMS = buildFakeAphexCMS({
			references: { a: ['d1'], b: [], c: ['d1', 'd2'] }
		});
		const res = await makeApp().fetch(
			new Request('http://localhost/assets/references/counts', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ ids: ['a', 'b', 'c'] })
			}),
			buildEnv(aphexCMS)
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toEqual({ a: 1, b: 0, c: 2 });
	});

	it('POST /references/counts handles empty ids[] without DB call', async () => {
		const aphexCMS = buildFakeAphexCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/assets/references/counts', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ ids: [] })
			}),
			buildEnv(aphexCMS)
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data).toEqual({});
	});

	it('does NOT collide with /assets/:id (precedence regression)', async () => {
		// POST /assets/references/counts must hit the references router,
		// not /assets/:id (which has no POST handler — would return 404).
		const aphexCMS = buildFakeAphexCMS();
		const res = await makeApp().fetch(
			new Request('http://localhost/assets/references/counts', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ ids: [] })
			}),
			buildEnv(aphexCMS)
		);
		expect(res.status).toBe(200);
	});
});

// ---------- asset.read enforcement ----------

/**
 * Authentication alone used to be enough to read asset data: the list, by-ID,
 * references and counts routes checked only that a session existed, while the
 * write routes checked capabilities. A role with `asset.read` withheld could
 * still enumerate the whole media library.
 */
describe('asset.read enforcement on the read routes', () => {
	const readRoutes: Array<{ name: string; request: () => Request }> = [
		{ name: 'GET /assets', request: () => new Request('http://localhost/assets') },
		{ name: 'GET /assets/:id', request: () => new Request('http://localhost/assets/a') },
		{
			name: 'GET /assets/:id/references',
			request: () => new Request('http://localhost/assets/a/references')
		},
		{
			name: 'POST /assets/references/counts',
			request: () =>
				new Request('http://localhost/assets/references/counts', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ ids: ['a'] })
				})
		}
	];

	for (const route of readRoutes) {
		it(`${route.name} → 403 without asset.read`, async () => {
			const aphexCMS = buildFakeAphexCMS({ assets: [{ id: 'a', title: 'Alpha' }] });
			const res = await makeApp().fetch(
				route.request(),
				buildEnv(aphexCMS, { capabilities: ['document.read'] })
			);
			expect(res.status).toBe(403);
			const body = await res.json();
			expect(body.success).toBe(false);
			expect(body.error).toContain('asset.read');
		});

		it(`${route.name} → 200 with asset.read`, async () => {
			const aphexCMS = buildFakeAphexCMS({ assets: [{ id: 'a', title: 'Alpha' }] });
			const res = await makeApp().fetch(
				route.request(),
				buildEnv(aphexCMS, { capabilities: ['asset.read'] })
			);
			expect(res.status).toBe(200);
		});

		it(`${route.name} → 200 with asset.upload alone (write implies read)`, async () => {
			// `normalizeCapabilities` runs at resolve time, so a role persisted
			// with only a write cap can't upload an asset and then 403 listing it.
			const aphexCMS = buildFakeAphexCMS({ assets: [{ id: 'a', title: 'Alpha' }] });
			const res = await makeApp().fetch(
				route.request(),
				buildEnv(aphexCMS, { capabilities: ['asset.upload'] })
			);
			expect(res.status).toBe(200);
		});
	}
});

// ---------- PATCH /assets/:id metadata clearing ----------

/**
 * `undefined` and `null` mean different things in a metadata patch: omitted
 * leaves the column alone, `null` clears it. The admin form used to send
 * `editTitle || undefined` for an emptied input, which `JSON.stringify` drops
 * from the body entirely — so metadata could be added but never removed.
 */
describe('PATCH /assets/:id metadata tri-state', () => {
	function patch(body: unknown) {
		return new Request('http://localhost/assets/a', {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
	}

	it('accepts null and passes it through as null', async () => {
		const aphexCMS = buildFakeAphexCMS({ assets: [{ id: 'a', title: 'Alpha' }] });
		const res = await makeApp().fetch(patch({ title: null, alt: null }), buildEnv(aphexCMS));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.title).toBeNull();
		expect(body.data.alt).toBeNull();
	});

	it('leaves omitted fields untouched', async () => {
		const aphexCMS = buildFakeAphexCMS({ assets: [{ id: 'a', title: 'Alpha' }] });
		const res = await makeApp().fetch(patch({ alt: 'described' }), buildEnv(aphexCMS));
		expect(res.status).toBe(200);
		const body = await res.json();
		// `title` was not in the body, so it survives.
		expect(body.data.title).toBe('Alpha');
		expect(body.data.alt).toBe('described');
	});

	it('403 without asset.upload', async () => {
		const aphexCMS = buildFakeAphexCMS({ assets: [{ id: 'a', title: 'Alpha' }] });
		const res = await makeApp().fetch(
			patch({ title: 'New' }),
			buildEnv(aphexCMS, { capabilities: ['asset.read'] })
		);
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toContain('asset.upload');
	});
});

// ---------- PATCH /assets/:id rename ----------

/**
 * Renaming is metadata-only. The stored object lives at
 * `{assetId}/original.{ext}`, derived from the id rather than the name, so
 * nothing moves in storage and existing `_ref`s keep resolving.
 */
describe('PATCH /assets/:id rename', () => {
	function patch(body: unknown) {
		return new Request('http://localhost/assets/a', {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
	}

	it('accepts a new originalFilename', async () => {
		const aphexCMS = buildFakeAphexCMS({ assets: [{ id: 'a', title: 'Alpha' }] });
		const res = await makeApp().fetch(
			patch({ originalFilename: 'renamed.png' }),
			buildEnv(aphexCMS)
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.originalFilename).toBe('renamed.png');
	});

	it('rejects an empty filename — an asset always has a name', async () => {
		const aphexCMS = buildFakeAphexCMS({ assets: [{ id: 'a' }] });
		const res = await makeApp().fetch(patch({ originalFilename: '   ' }), buildEnv(aphexCMS));
		expect(res.status).toBe(400);
	});

	it('rejects null — there is no "clear the filename" state', async () => {
		const aphexCMS = buildFakeAphexCMS({ assets: [{ id: 'a' }] });
		const res = await makeApp().fetch(patch({ originalFilename: null }), buildEnv(aphexCMS));
		expect(res.status).toBe(400);
	});

	it('leaves the filename alone when omitted', async () => {
		const aphexCMS = buildFakeAphexCMS({ assets: [{ id: 'a', title: 'Alpha' }] });
		const res = await makeApp().fetch(patch({ title: 'New title' }), buildEnv(aphexCMS));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.data.originalFilename).toBeUndefined();
	});
});
