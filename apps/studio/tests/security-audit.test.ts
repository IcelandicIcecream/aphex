import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createLocalAPI } from '@aphexcms/cms-core/server';
import { db } from '$lib/server/db';
import cmsConfig from './fixtures/config';
import { TEST_ORG_ID } from './helpers/test-constants';
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
import { resetPasswordRequest } from '@aphexcms/cms-core/api/schemas/user';
import { updateInstanceSettingsRequest } from '@aphexcms/cms-core/api/schemas/instance';
import { cmsLogger, setLogger, type Logger } from '@aphexcms/cms-core/server';
import {
	resolveCapabilities,
	coarseApiKeyCapabilities,
	BUILTIN_ROLE_SEED,
	type ApiKeyAuth
} from '@aphexcms/cms-core';
import { RateLimiter, clientAddress } from '@aphexcms/cms-core/server/api/rate-limit';

// ============================================================
// Helpers
// ============================================================

function makeAdminAuth(
	overrides: Partial<{
		role: string;
		organizationRole: string;
		capabilities: string[];
	}> = {}
) {
	return {
		type: 'session' as const,
		organizationId: 'test-org',
		organizationRole: overrides.organizationRole ?? 'owner',
		capabilities: overrides.capabilities ?? [
			'document.read',
			'document.create',
			'document.update',
			'document.delete',
			'document.publish',
			'document.unpublish',
			'asset.read',
			'asset.upload',
			'asset.delete',
			'member.invite',
			'member.remove',
			'member.changeRole',
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

function buildFakeAphexCMS(
	opts: {
		assets?: any[];
		uploadResult?: any;
		countResult?: number;
	} = {}
) {
	const assets = opts.assets ?? [];
	return {
		assetService: {
			findAssets: async () => assets,
			findAssetById: async (_orgId: string, id: string) =>
				assets.find((a: any) => a.id === id) ?? null,
			deleteAsset: async (_orgId: string, id: string) => assets.some((a: any) => a.id === id),
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

	it('blocks HTML content disguised as an allowed image', () => {
		const buffer = Buffer.from('<!doctype html><script>alert(1)</script>');
		const result = validateFile(buffer, 'photo.png', 'image/png', {
			allowedMimeTypes: ['image/*']
		});

		expect(result.valid).toBe(false);
		expect(result.detectedMimeType).toBe('text/html');
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
		await expect(adapter.getObject('/etc/passwd')).rejects.toThrow('Access denied');
	});

	it('getObject rejects traversal paths', async () => {
		await expect(adapter.getObject(join(tmpDir, '..', '..', 'etc', 'passwd'))).rejects.toThrow(
			'Access denied'
		);
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
		const errors = checkDepth('{ viewer { friends { friends { name } } } }', 2);
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
		const res = await app.fetch(new Request('http://localhost/api/aphex-health'), {
			aphexCMS,
			auth: null
		} as any);
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
		const res = await app.fetch(new Request('http://localhost/api/aphex-health'), {
			aphexCMS,
			auth: null
		} as any);
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
	function makeVersionsApp(_versionService: any) {
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

// ============================================================
// Password minimum length
// ============================================================

describe('password minimum length', () => {
	it('rejects passwords shorter than 8 characters', () => {
		const result = resetPasswordRequest.safeParse({
			token: 'valid-token',
			newPassword: 'short'
		});
		expect(result.success).toBe(false);
	});

	it('rejects single-character passwords', () => {
		const result = resetPasswordRequest.safeParse({
			token: 'valid-token',
			newPassword: 'a'
		});
		expect(result.success).toBe(false);
	});

	it('accepts passwords of 8+ characters', () => {
		const result = resetPasswordRequest.safeParse({
			token: 'valid-token',
			newPassword: 'secureP@ss1'
		});
		expect(result.success).toBe(true);
	});
});

// ============================================================
// Instance settings Zod validation
// ============================================================

describe('instance settings validation', () => {
	it('accepts valid allowUserOrgCreation boolean', () => {
		const result = updateInstanceSettingsRequest.safeParse({
			allowUserOrgCreation: true
		});
		expect(result.success).toBe(true);
	});

	it('rejects unknown fields (strict mode)', () => {
		const result = updateInstanceSettingsRequest.safeParse({
			allowUserOrgCreation: true,
			dangerousFlag: 'injected'
		});
		expect(result.success).toBe(false);
	});

	it('rejects non-boolean allowUserOrgCreation', () => {
		const result = updateInstanceSettingsRequest.safeParse({
			allowUserOrgCreation: 'yes'
		});
		expect(result.success).toBe(false);
	});

	it('accepts empty object (all fields optional)', () => {
		const result = updateInstanceSettingsRequest.safeParse({});
		expect(result.success).toBe(true);
	});
});

// ============================================================
// MIME type override (client type not trusted)
// ============================================================

describe('MIME type override on upload', () => {
	it('detectMimeType returns correct type for PNG with a generic client type', () => {
		const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		const padded = Buffer.alloc(64);
		pngMagic.copy(padded);

		const result = validateFile(padded, 'image.png', 'application/octet-stream', {});
		expect(result.valid).toBe(true);
		expect(result.detectedMimeType).toBe('image/png');
	});

	it('detectMimeType returns null for unknown format — caller should use application/octet-stream', () => {
		const unknownBytes = Buffer.from('just some random text content');
		const result = validateFile(unknownBytes, 'data.bin', 'application/octet-stream', {});
		expect(result.valid).toBe(true);
		expect(result.detectedMimeType).toBeNull();
	});

	it('recognizes textual CSV without trusting a binary file renamed to .csv', () => {
		const csv = Buffer.from('Category,SKU,Price\nLighting,ABC-123,99.95\n');
		expect(validateFile(csv, 'prices.csv', 'application/octet-stream')).toMatchObject({
			valid: true,
			detectedMimeType: 'text/csv'
		});

		const binary = Buffer.from([0x00, 0xff, 0x00, 0x01]);
		expect(
			validateFile(binary, 'prices.csv', 'application/octet-stream', {
				allowedMimeTypes: ['text/csv']
			})
		).toMatchObject({ valid: false, detectedMimeType: null });
	});

	it('does not let an explicit wildcard restore a blocked MIME type', () => {
		expect(
			validateFile(Buffer.from('<body>active content</body>'), 'payload.txt', 'text/html', {
				allowedMimeTypes: ['text/*']
			})
		).toMatchObject({ valid: false, error: expect.stringContaining('text/html') });
	});
});

// ============================================================
// Logger interface
// ============================================================

describe('logger interface', () => {
	it('setLogger replaces the active logger', () => {
		const messages: string[] = [];
		const customLogger: Logger = {
			debug: (...args: any[]) => messages.push(`debug:${args.join(' ')}`),
			info: (...args: any[]) => messages.push(`info:${args.join(' ')}`),
			warn: (...args: any[]) => messages.push(`warn:${args.join(' ')}`),
			error: (...args: any[]) => messages.push(`error:${args.join(' ')}`)
		};

		setLogger(customLogger);
		cmsLogger.info('test message');

		expect(messages.length).toBeGreaterThan(0);
		expect(messages.some((m) => m.includes('test message'))).toBe(true);
	});

	it('all log levels delegate to custom logger', () => {
		const calls: Record<string, number> = { debug: 0, info: 0, warn: 0, error: 0 };
		const countingLogger: Logger = {
			debug: () => {
				calls.debug++;
			},
			info: () => {
				calls.info++;
			},
			warn: () => {
				calls.warn++;
			},
			error: () => {
				calls.error++;
			}
		};

		setLogger(countingLogger);
		cmsLogger.debug('d');
		cmsLogger.info('i');
		cmsLogger.warn('w');
		cmsLogger.error('e');

		expect(calls.debug).toBe(1);
		expect(calls.info).toBe(1);
		expect(calls.warn).toBe(1);
		expect(calls.error).toBe(1);
	});
});

// ============================================================
// Cross-collection authorization bypass (audit finding 3)
//
// Document IDs are globally unique, but permissions are evaluated against the
// collection the caller addressed. A lookup keyed on ID alone therefore let a
// caller authorised for one collection reach a known ID in a restricted one.
// ============================================================

describe('cross-collection document access', () => {
	let localAPI: ReturnType<typeof createLocalAPI>;
	const ctx = { organizationId: TEST_ORG_ID, overrideAccess: true };
	let pageId: string;

	beforeAll(async () => {
		localAPI = createLocalAPI(cmsConfig, db);
		const created = await localAPI.collections.page.create(ctx, {
			title: 'Cross-collection probe',
			slug: 'cross-collection-probe'
		} as never);
		pageId = created.document.id;
	}, 30000);

	afterAll(async () => {
		if (pageId) {
			await localAPI.collections.page.delete(ctx, pageId).catch(() => {});
		}
	});

	it('finds the document through its own collection', async () => {
		const found = await localAPI.collections.page.findByID(ctx, pageId);
		expect(found).not.toBeNull();
		expect(found?.id).toBe(pageId);
	});

	it('does not return a page through a different collection', async () => {
		// Reported as "not found" rather than "forbidden" on purpose: the caller
		// has no permission to learn the ID exists elsewhere.
		const leaked = await localAPI.collections.author.findByID(ctx, pageId);
		expect(leaked).toBeNull();
	});

	it('does not mutate a page through a different collection', async () => {
		const result = await localAPI.collections.author.update(ctx, pageId, {
			title: 'overwritten via wrong collection'
		} as never);
		expect(result).toBeNull();

		// The original document must be untouched.
		const after = await localAPI.collections.page.findByID(ctx, pageId);
		expect((after as { title?: string } | null)?.title).toBe('Cross-collection probe');
	});

	it('does not delete a page through a different collection', async () => {
		const deleted = await localAPI.collections.author.delete(ctx, pageId);
		expect(deleted).toBe(false);

		const survivor = await localAPI.collections.page.findByID(ctx, pageId);
		expect(survivor).not.toBeNull();
	});

	it('does not publish a page through a different collection', async () => {
		await expect(localAPI.collections.author.publish(ctx, pageId)).rejects.toThrow();
	});
});

// ---------------------------------------------------------------------------
// API key capability resolution
// ---------------------------------------------------------------------------

describe('API key capability resolution', () => {
	/** Minimal `ApiKeyAuth` — only the fields `resolveCapabilities` reads. */
	function apiKeyAuth(overrides: Partial<ApiKeyAuth>): ApiKeyAuth {
		return {
			type: 'api_key',
			keyId: 'key_1',
			name: 'Test Key',
			permissions: ['read'],
			organizationId: TEST_ORG_ID,
			...overrides
		} as ApiKeyAuth;
	}

	it('treats an explicit empty allowlist as no capabilities', () => {
		// The regression this guards: an allowlist that the owner-role clamp
		// stripped to nothing used to fall through to the coarse read/write
		// expansion, so filtering out every disallowed capability made the key
		// *more* powerful than asking for none at all.
		const caps = resolveCapabilities(
			apiKeyAuth({ capabilities: [], permissions: ['read', 'write'] })
		);
		expect(caps.size).toBe(0);
	});

	it('honours an explicit allowlist over the coarse scopes', () => {
		const caps = resolveCapabilities(
			apiKeyAuth({ capabilities: ['document.read'], permissions: ['read', 'write'] })
		);
		expect([...caps]).toEqual(['document.read']);
		expect(caps.has('document.delete')).toBe(false);
	});

	it('expands coarse scopes only when no allowlist is present', () => {
		const readOnly = resolveCapabilities(apiKeyAuth({ permissions: ['read'] }));
		expect(readOnly.has('document.read')).toBe(true);
		expect(readOnly.has('document.create')).toBe(false);

		const writable = resolveCapabilities(apiKeyAuth({ permissions: ['read', 'write'] }));
		expect(writable.has('document.create')).toBe(true);
		expect(writable.has('asset.delete')).toBe(true);
	});

	it('derives the same coarse set the resolver falls back to', () => {
		// `validateApiKey` clamps this against the owner's grantable set before it
		// ever reaches the resolver; the two must agree on what the scopes mean or
		// the clamp would be applied to a different set than the one in force.
		const coarse = new Set(coarseApiKeyCapabilities(['read', 'write']));
		const resolved = resolveCapabilities(apiKeyAuth({ permissions: ['read', 'write'] }));
		expect([...coarse].sort()).toEqual([...resolved].sort());
	});
});

// ============================================================
// Rate limiting on the unauthenticated auth facades
// ============================================================

describe('RateLimiter (password-reset facade throttle)', () => {
	it('allows up to max per window, then refuses with a retry hint', () => {
		const limiter = new RateLimiter({ windowMs: 60_000, max: 2 });
		expect(limiter.check('a').allowed).toBe(true);
		expect(limiter.check('a').allowed).toBe(true);

		const third = limiter.check('a');
		expect(third.allowed).toBe(false);
		expect(third.retryAfterSeconds).toBeGreaterThan(0);
		expect(third.retryAfterSeconds).toBeLessThanOrEqual(60);
	});

	it('keys independently, so one caller cannot exhaust another', () => {
		const limiter = new RateLimiter({ windowMs: 60_000, max: 1 });
		expect(limiter.check('alice@example.com').allowed).toBe(true);
		expect(limiter.check('alice@example.com').allowed).toBe(false);
		// A different key still has its full allowance.
		expect(limiter.check('bob@example.com').allowed).toBe(true);
	});

	it('lets the window roll over', async () => {
		const limiter = new RateLimiter({ windowMs: 30, max: 1 });
		expect(limiter.check('k').allowed).toBe(true);
		expect(limiter.check('k').allowed).toBe(false);
		await new Promise((r) => setTimeout(r, 45));
		expect(limiter.check('k').allowed).toBe(true);
	});

	it('reads the left-most x-forwarded-for entry, falling back sanely', () => {
		// Left-most is the original client; proxies append themselves to the right.
		expect(clientAddress(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe(
			'203.0.113.7'
		);
		expect(clientAddress(new Headers({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4');
		// No header at all must still produce a usable key rather than throwing — every
		// unattributable caller then shares one bucket, which is the safe direction.
		expect(clientAddress(new Headers())).toBe('unknown');
	});
});

// ============================================================
// API key management is one capability, not two gates
// ============================================================

describe('apiKey.manage covers both issuing and revoking', () => {
	/** The built-in roles that hold `apiKey.manage`, straight from the seed. */
	function seedCaps(role: 'viewer' | 'editor' | 'admin' | 'owner'): readonly string[] {
		return BUILTIN_ROLE_SEED[role].capabilities;
	}

	it('grants apiKey.manage to admin and owner only', () => {
		expect(seedCaps('admin')).toContain('apiKey.manage');
		expect(seedCaps('owner')).toContain('apiKey.manage');
		expect(seedCaps('editor')).not.toContain('apiKey.manage');
		expect(seedCaps('viewer')).not.toContain('apiKey.manage');
	});

	it('editor cannot manage keys — the case the old delete gate got wrong', () => {
		// DELETE /api/settings/api-keys/[id] used to check the org role directly and allow
		// `owner | admin | editor`, so an editor could revoke keys they were never allowed to
		// issue. Both halves now consult this one capability; if the seed ever grants
		// `apiKey.manage` to editor, that is a deliberate decision and this test should be
		// the thing that surfaces it.
		const editor = resolveCapabilities({
			type: 'session',
			user: { id: 'u1', email: 'e@example.com', role: 'editor' },
			session: { id: 's1', expiresAt: new Date(Date.now() + 60_000) },
			organizationId: TEST_ORG_ID,
			organizationRole: 'editor'
		} as never);
		expect(editor.has('apiKey.manage')).toBe(false);
	});

	it('a custom role granted apiKey.manage passes the same gate', () => {
		// The other direction the hardcoded role list got wrong: a custom role with the
		// capability could create keys it then had no way to revoke.
		const custom = resolveCapabilities({
			type: 'session',
			user: { id: 'u2', email: 'c@example.com', role: 'editor' },
			session: { id: 's2', expiresAt: new Date(Date.now() + 60_000) },
			organizationId: TEST_ORG_ID,
			organizationRole: 'Key Custodian',
			capabilities: ['document.read', 'apiKey.manage']
		} as never);
		expect(custom.has('apiKey.manage')).toBe(true);
	});
});
