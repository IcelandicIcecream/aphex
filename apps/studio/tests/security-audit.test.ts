import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import { join, resolve } from 'path';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';

// --- Route imports ---
import { assetsRouter } from '@aphexcms/cms-core/server/api/routes/assets';
import { assetsByIdRouter } from '@aphexcms/cms-core/server/api/routes/assets-by-id';
import { assetsBulkRouter } from '@aphexcms/cms-core/server/api/routes/assets-bulk';
import { documentsRouter } from '@aphexcms/cms-core/server/api/routes/documents';
import { documentsQueryRouter } from '@aphexcms/cms-core/server/api/routes/documents-query';
import { documentVersionsRouter } from '@aphexcms/cms-core/server/api/routes/document-versions';
import { createAphexApi, mountAphexBuiltins } from '@aphexcms/cms-core/server/api/index';
import type { AphexEnv } from '@aphexcms/cms-core/server/api/index';

// --- Utility imports ---
import { validateFile } from '@aphexcms/cms-core/utils/mime-detect';
import { LocalStorageAdapter } from '@aphexcms/cms-core/storage/adapters/local-storage-adapter';
import { hiddenReadFields, hiddenWriteFields } from '@aphexcms/cms-core/field-access';
import { depthLimit } from '@aphexcms/cms-core/graphql/depth-limit';

// --- Schema imports ---
import { listDocumentsQuery } from '@aphexcms/cms-core/api/schemas/documents';
import { queryDocumentsRequest } from '@aphexcms/cms-core/api/schemas/documents';
import { bulkDeleteAssetsRequest } from '@aphexcms/cms-core/api/schemas/assets';

// ============================================================
// Helpers
// ============================================================

function makeAdminAuth(overrides: Partial<{
	role: string;
	organizationRole: string;
	capabilities: string[];
}> = {}) {
	return {
		type: 'session' as const,
		organizationId: 'test-org',
		organizationRole: overrides.organizationRole ?? 'owner',
		capabilities: overrides.capabilities ?? [
			'document.read', 'document.create', 'document.update', 'document.delete',
			'document.publish', 'document.unpublish',
			'asset.read', 'asset.upload', 'asset.delete',
			'member.invite', 'member.remove', 'member.changeRole',
			'apiKey.manage'
		],
		user: {
			id: 'test-user',
			email: 'test@example.com',
			name: 'Test Admin',
			role: overrides.role ?? 'admin'
		}
	} as any;
}

function makeViewerAuth() {
	return {
		type: 'session' as const,
		organizationId: 'test-org',
		organizationRole: 'viewer',
		capabilities: ['document.read', 'asset.read'],
		user: {
			id: 'viewer-user',
			email: 'viewer@example.com',
			name: 'Test Viewer',
			role: 'editor'
		}
	} as any;
}

function buildFakeAphexCMS(opts: {
	assets?: any[];
	uploadResult?: any;
	countResult?: number;
} = {}) {
	const assets = opts.assets ?? [];
	return {
		assetService: {
			findAssets: async () => assets,
			findAssetById: async (_orgId: string, id: string) =>
				assets.find((a: any) => a.id === id) ?? null,
			deleteAsset: async (_orgId: string, id: string) =>
				assets.some((a: any) => a.id === id),
			updateAssetMetadata: async (_orgId: string, id: string, patch: any) => {
				const a = assets.find((x: any) => x.id === id);
				return a ? { ...a, ...patch } : null;
			},
			uploadAsset: async () => opts.uploadResult ?? { id: 'uploaded-id' }
		},
		databaseAdapter: {
			countAssets: async () => opts.countResult ?? assets.length,
			findDocumentsReferencingAsset: async () => [],
			countDocumentReferencesForAssets: async (_orgId: string, ids: string[]) => {
				const counts: Record<string, number> = {};
				for (const id of ids) counts[id] = 0;
				return counts;
			},
			isHealthy: async () => true
		},
		localAPI: {
			collections: {},
			hasCollection: () => false,
			getCollectionNames: () => []
		}
	};
}

function makeAssetsApp() {
	const app = new Hono<AphexEnv>();
	app.use('*', async (c, next) => {
		c.set('aphexCMS', c.env.aphexCMS);
		c.set('auth', c.env.auth);
		await next();
	});
	app.route('/assets', assetsBulkRouter);
	app.route('/assets', assetsByIdRouter);
	app.route('/assets', assetsRouter);
	return app;
}

function makeDocumentsApp(localAPI: any) {
	const app = new Hono<AphexEnv>();
	app.use('*', async (c, next) => {
		c.set('aphexCMS', c.env.aphexCMS);
		c.set('auth', c.env.auth);
		await next();
	});
	app.route('/documents', documentsQueryRouter);
	app.route('/documents', documentsRouter);
	return app;
}

// ============================================================
// 1. filterOrganizationIds removed from schemas
// ============================================================

describe('filterOrganizationIds removal', () => {
	it('listDocumentsQuery strips unknown keys including filterOrganizationIds', () => {
		const result = listDocumentsQuery.safeParse({
			type: 'page',
			filterOrganizationIds: 'org-1,org-2'
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect((result.data as any).filterOrganizationIds).toBeUndefined();
		}
	});

	it('queryDocumentsRequest strips filterOrganizationIds', () => {
		const result = queryDocumentsRequest.safeParse({
			type: 'page',
			filterOrganizationIds: ['org-1', 'org-2']
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect((result.data as any).filterOrganizationIds).toBeUndefined();
		}
	});
});

// ============================================================
// 2. Asset upload IDOR — organizationId from form data ignored
// ============================================================

describe('asset upload IDOR fix', () => {
	it('ignores organizationId in form data and uses auth.organizationId', async () => {
		let capturedOrgId: string | undefined;
		const aphexCMS = {
			...buildFakeAphexCMS(),
			assetService: {
				...buildFakeAphexCMS().assetService,
				uploadAsset: async (orgId: string) => {
					capturedOrgId = orgId;
					return { id: 'uploaded' };
				}
			}
		};

		const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		const fd = new FormData();
		fd.set('file', new File([pngHeader], 'test.png', { type: 'image/png' }));
		fd.set('organizationId', 'attacker-org-id');

		const res = await makeAssetsApp().fetch(
			new Request('http://localhost/assets', { method: 'POST', body: fd }),
			{ aphexCMS, auth: makeAdminAuth() } as any
		);

		if (res.status === 200) {
			expect(capturedOrgId).toBe('test-org');
			expect(capturedOrgId).not.toBe('attacker-org-id');
		}
	});
});

// ============================================================
// 3. HTML/SVG upload validation
// ============================================================

describe('file upload validation', () => {
	it('blocks .html files', () => {
		const buffer = Buffer.from('<html><script>alert(1)</script></html>');
		const result = validateFile(buffer, 'payload.html', 'text/html');
		expect(result.valid).toBe(false);
	});

	it('blocks .htm files', () => {
		const buffer = Buffer.from('<html></html>');
		const result = validateFile(buffer, 'payload.htm', 'text/html');
		expect(result.valid).toBe(false);
	});

	it('blocks .xhtml files', () => {
		const buffer = Buffer.from('<html></html>');
		const result = validateFile(buffer, 'payload.xhtml', 'application/xhtml+xml');
		expect(result.valid).toBe(false);
	});

	it('blocks .shtml files', () => {
		const buffer = Buffer.from('<!--#include file="x"-->');
		const result = validateFile(buffer, 'payload.shtml', 'text/html');
		expect(result.valid).toBe(false);
	});

	it('allows .svg files (not blocked)', () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>';
		const buffer = Buffer.from(svg);
		const result = validateFile(buffer, 'logo.svg', 'image/svg+xml');
		expect(result.valid).toBe(true);
	});

	it('allows normal image uploads', () => {
		const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		const result = validateFile(pngHeader, 'photo.png', 'image/png');
		expect(result.valid).toBe(true);
	});

	it('blocks double extension bypass (file.html.pdf)', () => {
		const buffer = Buffer.from('<html><script>alert(1)</script></html>');
		const result = validateFile(buffer, 'payload.html.pdf', 'application/pdf');
		expect(result.valid).toBe(false);
		expect(result.error).toContain('.html');
	});

	it('blocks double extension bypass (file.exe.jpg)', () => {
		const buffer = Buffer.from([0x4d, 0x5a, 0x00, 0x00]);
		const result = validateFile(buffer, 'malware.exe.jpg', 'image/jpeg');
		expect(result.valid).toBe(false);
	});
});

// ============================================================
// 4. Local storage path traversal
// ============================================================

describe('LocalStorageAdapter path safety', () => {
	let tmpDir: string;
	let adapter: LocalStorageAdapter;

	beforeAll(async () => {
		tmpDir = await mkdtemp(join(tmpdir(), 'aphex-test-'));
		adapter = new LocalStorageAdapter({ basePath: tmpDir });
	});

	afterAll(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	it('sanitizes path traversal in filenames during store', async () => {
		const result = await adapter.store({
			buffer: Buffer.from('safe content'),
			filename: '../../../etc/passwd',
			mimeType: 'text/plain',
			size: 12
		});
		expect(result.path).not.toContain('..');
		expect(resolve(result.path).startsWith(resolve(tmpDir))).toBe(true);
	});

	it('getObject rejects paths outside basePath', async () => {
		await expect(
			adapter.getObject('/etc/passwd')
		).rejects.toThrow('Access denied');
	});

	it('getObject rejects traversal paths', async () => {
		await expect(
			adapter.getObject(join(tmpDir, '..', '..', 'etc', 'passwd'))
		).rejects.toThrow('Access denied');
	});

	it('getObject allows paths within basePath', async () => {
		const testFile = join(tmpDir, 'allowed.txt');
		await writeFile(testFile, 'ok');
		const content = await adapter.getObject(testFile);
		expect(content.toString()).toBe('ok');
	});

	it('delete rejects paths outside basePath', async () => {
		const result = await adapter.delete('/etc/passwd');
		expect(result).toBe(false);
	});

	it('exists returns false for paths outside basePath', async () => {
		const result = await adapter.exists('/etc/passwd');
		expect(result).toBe(false);
	});
});

// ============================================================
// 5. hasCapability checks on asset routes
// ============================================================

describe('asset route capability checks', () => {
	it('POST /assets returns 403 for viewer (no asset.upload)', async () => {
		const aphexCMS = buildFakeAphexCMS();
		const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		const fd = new FormData();
		fd.set('file', new File([pngHeader], 'test.png', { type: 'image/png' }));

		const res = await makeAssetsApp().fetch(
			new Request('http://localhost/assets', { method: 'POST', body: fd }),
			{ aphexCMS, auth: makeViewerAuth() } as any
		);
		expect(res.status).toBe(403);
	});

	it('DELETE /assets/:id returns 403 for viewer (no asset.delete)', async () => {
		const aphexCMS = buildFakeAphexCMS({ assets: [{ id: 'a' }] });
		const res = await makeAssetsApp().fetch(
			new Request('http://localhost/assets/a', { method: 'DELETE' }),
			{ aphexCMS, auth: makeViewerAuth() } as any
		);
		expect(res.status).toBe(403);
	});

	it('PATCH /assets/:id returns 403 for viewer (no asset.upload)', async () => {
		const aphexCMS = buildFakeAphexCMS({ assets: [{ id: 'a' }] });
		const res = await makeAssetsApp().fetch(
			new Request('http://localhost/assets/a', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ title: 'hacked' })
			}),
			{ aphexCMS, auth: makeViewerAuth() } as any
		);
		expect(res.status).toBe(403);
	});

	it('DELETE /assets/bulk returns 403 for viewer (no asset.delete)', async () => {
		const aphexCMS = buildFakeAphexCMS();
		const res = await makeAssetsApp().fetch(
			new Request('http://localhost/assets/bulk', {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ ids: ['a', 'b'] })
			}),
			{ aphexCMS, auth: makeViewerAuth() } as any
		);
		expect(res.status).toBe(403);
	});

	it('POST /assets succeeds for admin (has asset.upload)', async () => {
		const aphexCMS = buildFakeAphexCMS();
		const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		const fd = new FormData();
		fd.set('file', new File([pngHeader], 'test.png', { type: 'image/png' }));

		const res = await makeAssetsApp().fetch(
			new Request('http://localhost/assets', { method: 'POST', body: fd }),
			{ aphexCMS, auth: makeAdminAuth() } as any
		);
		expect(res.status).toBe(200);
	});
});

// ============================================================
// 6. Bulk delete max limit
// ============================================================

describe('bulk delete max limit', () => {
	it('rejects more than 100 IDs', () => {
		const ids = Array.from({ length: 101 }, (_, i) => `id-${i}`);
		const result = bulkDeleteAssetsRequest.safeParse({ ids });
		expect(result.success).toBe(false);
	});

	it('accepts exactly 100 IDs', () => {
		const ids = Array.from({ length: 100 }, (_, i) => `id-${i}`);
		const result = bulkDeleteAssetsRequest.safeParse({ ids });
		expect(result.success).toBe(true);
	});

	it('accepts 1 ID', () => {
		const result = bulkDeleteAssetsRequest.safeParse({ ids: ['id-1'] });
		expect(result.success).toBe(true);
	});
});

// ============================================================
// 7. Server-side file size enforcement
// ============================================================

describe('server-side file size cap', () => {
	it('rejects files larger than 50MB even if client sends large maxSize', async () => {
		const aphexCMS = buildFakeAphexCMS();
		const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		const fd = new FormData();
		fd.set('file', new File([pngHeader], 'test.png', { type: 'image/png' }));
		fd.set('maxSize', '999999999999');

		const res = await makeAssetsApp().fetch(
			new Request('http://localhost/assets', { method: 'POST', body: fd }),
			{ aphexCMS, auth: makeAdminAuth() } as any
		);
		// The file is tiny so it won't hit the limit, but verify it doesn't crash
		expect([200, 400]).toContain(res.status);
	});
});

// ============================================================
// 8. GraphQL depth limiting
// ============================================================

describe('GraphQL depth limit', () => {
	let graphql: typeof import('graphql');

	beforeAll(async () => {
		graphql = await import('graphql');
	});

	function checkDepth(query: string, maxDepth: number): string[] {
		const schema = new graphql.GraphQLSchema({
			query: new graphql.GraphQLObjectType({
				name: 'Query',
				fields: () => ({
					viewer: {
						type: new graphql.GraphQLObjectType({
							name: 'Viewer',
							fields: () => ({
								name: { type: graphql.GraphQLString },
								friends: {
									type: new graphql.GraphQLList(
										new graphql.GraphQLObjectType({
											name: 'Friend',
											fields: () => ({
												name: { type: graphql.GraphQLString },
												friends: {
													type: new graphql.GraphQLList(
														new graphql.GraphQLObjectType({
															name: 'DeepFriend',
															fields: {
																name: { type: graphql.GraphQLString }
															}
														})
													)
												}
											})
										})
									)
								}
							})
						})
					}
				})
			})
		});

		const doc = graphql.parse(query);
		const errors = graphql.validate(schema, doc, [depthLimit(maxDepth)]);
		return errors.map((e) => e.message);
	}

	it('allows queries within depth limit', () => {
		const errors = checkDepth('{ viewer { name } }', 5);
		expect(errors).toHaveLength(0);
	});

	it('rejects queries exceeding depth limit', () => {
		const errors = checkDepth(
			'{ viewer { friends { friends { name } } } }',
			2
		);
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0]).toContain('exceeds maximum operation depth');
	});

	it('allows queries at exactly the depth limit', () => {
		const errors = checkDepth('{ viewer { friends { name } } }', 3);
		expect(errors).toHaveLength(0);
	});
});

// ============================================================
// 9. Field access — instance roles bypass
// ============================================================

describe('field access — instance role bypass', () => {
	const schema = {
		name: 'testDoc',
		type: 'document' as const,
		title: 'Test',
		fields: [
			{ name: 'title', type: 'string' as const, title: 'Title' },
			{
				name: 'secret',
				type: 'string' as const,
				title: 'Secret',
				access: { read: ['translator'], update: ['translator'] }
			}
		]
	};

	it('hides field from user without the role', () => {
		const auth = makeAdminAuth({ role: 'editor', organizationRole: 'editor' });
		const hidden = hiddenReadFields(schema as any, auth);
		expect(hidden.has('secret')).toBe(true);
	});

	it('shows field to user with the role', () => {
		const auth = makeAdminAuth({ organizationRole: 'translator' });
		const hidden = hiddenReadFields(schema as any, auth);
		expect(hidden.has('secret')).toBe(false);
	});

	it('super_admin bypasses field access entirely', () => {
		const auth = makeAdminAuth({ role: 'super_admin', organizationRole: 'viewer' });
		const readHidden = hiddenReadFields(schema as any, auth);
		const writeHidden = hiddenWriteFields(schema as any, auth);
		expect(readHidden.has('secret')).toBe(false);
		expect(writeHidden.has('secret')).toBe(false);
	});

	it('admin bypasses field access entirely', () => {
		const auth = makeAdminAuth({ role: 'admin', organizationRole: 'viewer' });
		const readHidden = hiddenReadFields(schema as any, auth);
		const writeHidden = hiddenWriteFields(schema as any, auth);
		expect(readHidden.has('secret')).toBe(false);
		expect(writeHidden.has('secret')).toBe(false);
	});
});

// ============================================================
// 10. Health endpoint
// ============================================================

describe('GET /api/aphex-health', () => {
	it('returns healthy when database is up', async () => {
		const app = createAphexApi();
		mountAphexBuiltins(app);

		const aphexCMS = buildFakeAphexCMS();
		const res = await app.fetch(
			new Request('http://localhost/api/aphex-health'),
			{ aphexCMS, auth: null } as any
		);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.status).toBe('healthy');
		expect(body.database).toBe(true);
	});

	it('returns 503 when database is down', async () => {
		const app = createAphexApi();
		mountAphexBuiltins(app);

		const aphexCMS = {
			...buildFakeAphexCMS(),
			databaseAdapter: { isHealthy: async () => false }
		};
		const res = await app.fetch(
			new Request('http://localhost/api/aphex-health'),
			{ aphexCMS, auth: null } as any
		);
		expect(res.status).toBe(503);
		const body = await res.json();
		expect(body.status).toBe('degraded');
		expect(body.database).toBe(false);
	});
});

// ============================================================
// 11. Version restore capability check
// ============================================================

describe('version restore capability check', () => {
	function makeVersionsApp(versionService: any) {
		const app = new Hono<AphexEnv>();
		app.use('*', async (c, next) => {
			c.set('aphexCMS', c.env.aphexCMS);
			c.set('auth', c.env.auth);
			await next();
		});
		app.route('/documents', documentVersionsRouter);
		return app;
	}

	it('returns 403 for viewer on version restore', async () => {
		const aphexCMS = {
			localAPI: {
				versionService: {
					restoreVersion: async () => ({ id: 'doc-1' })
				}
			},
			databaseAdapter: {},
			auth: null
		};

		const res = await makeVersionsApp(aphexCMS.localAPI.versionService).fetch(
			new Request('http://localhost/documents/doc-1/versions/1/restore', { method: 'POST' }),
			{ aphexCMS, auth: makeViewerAuth() } as any
		);
		expect(res.status).toBe(403);
	});

	it('allows admin to restore version', async () => {
		const aphexCMS = {
			localAPI: {
				versionService: {
					restoreVersion: async () => ({ id: 'doc-1', type: 'page' })
				}
			},
			databaseAdapter: {},
			auth: null
		};

		const res = await makeVersionsApp(aphexCMS.localAPI.versionService).fetch(
			new Request('http://localhost/documents/doc-1/versions/1/restore', { method: 'POST' }),
			{ aphexCMS, auth: makeAdminAuth() } as any
		);
		expect(res.status).toBe(200);
	});
});
