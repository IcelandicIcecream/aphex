/**
 * Smoke coverage for every MCP content tool (`buildContentTools`) — each tool's handler is
 * invoked with valid input against fake `localAPI`/`assetService` doubles, asserting it
 * doesn't error and calls through to the collection/service method it's supposed to.
 *
 * Includes a dedicated regression case for the asset-tool authorization gap fixed on this
 * branch: `list_assets`/`upload_asset` used to call `assetService` directly with no
 * capability check, unlike every other document tool (which run through `CollectionAPI`,
 * permission-checked transitively). An API key without `asset.read`/`asset.upload` could
 * still list or upload assets via MCP.
 *
 * Lives in tests/ (not src/) so the package build never compiles it into dist.
 * Run: pnpm -F @aphexcms/cms-core test
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/lib/utils/fetch-remote-file', () => ({
	fetchRemoteFile: vi.fn()
}));

import {
	buildContentTools,
	contentAgentTools,
	resolveAgentTools,
	type McpTool
} from '../src/lib/mcp/tools';
import { fetchRemoteFile } from '../src/lib/utils/fetch-remote-file';
import { RevisionConflictError } from '../src/lib/db/interfaces/document';
import type { CMSInstances } from '../src/lib/hooks';
import type { LocalAPIContext } from '../src/lib/local-api/types';
import type { ApiKeyAuth } from '../src/lib/types/auth';
import type { SchemaType } from '../src/lib/types/schemas';
import type { AgentToolPart } from '../src/lib/plugins/types';

function fakeAuth(capabilities: string[]): ApiKeyAuth {
	return {
		type: 'api_key',
		keyId: 'key-1',
		name: 'test key',
		permissions: [],
		capabilities
	} as unknown as ApiKeyAuth;
}

const postSchema: SchemaType = {
	type: 'document',
	name: 'post',
	title: 'Post',
	fields: [{ name: 'title', type: 'string', title: 'Title' }]
} as SchemaType;

const settingsSchema: SchemaType = {
	type: 'document',
	name: 'settings',
	title: 'Settings',
	singleton: true,
	fields: [{ name: 'siteName', type: 'string', title: 'Site Name' }]
} as SchemaType;

function fakeCollection(overrides: Record<string, any> = {}) {
	return {
		find: vi.fn().mockResolvedValue({ docs: [{ id: 'doc-1', title: 'Hello' }], totalDocs: 1 }),
		findByID: vi.fn().mockResolvedValue({ id: 'doc-1', title: 'Hello' }),
		create: vi.fn().mockResolvedValue({
			document: { id: 'doc-1', title: 'Hello' },
			validation: { isValid: true, errors: [] }
		}),
		update: vi.fn().mockResolvedValue({
			document: { id: 'doc-1', title: 'Updated' },
			validation: { isValid: true, errors: [] }
		}),
		publish: vi.fn().mockResolvedValue({ id: 'doc-1', title: 'Hello', status: 'published' }),
		get: vi.fn().mockResolvedValue({ id: 'settings', siteName: 'My Site' }),
		getSingletonId: vi.fn().mockReturnValue(null),
		...overrides
	};
}

// Minimal valid PNG signature — enough to pass `validateFile`'s magic-byte sniff.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function setup(
	capabilities: string[] = [
		'document.read',
		'document.create',
		'document.update',
		'document.publish',
		'asset.read',
		'asset.upload'
	],
	pluginTools: AgentToolPart[] = []
) {
	const findAssets = vi.fn().mockResolvedValue([]);
	const countAssets = vi.fn().mockResolvedValue(0);
	const uploadAsset = vi.fn().mockResolvedValue({ id: 'asset-1' });
	const postCollection = fakeCollection();
	const settingsCollection = fakeCollection({
		getSingletonId: vi.fn().mockReturnValue('settings')
	});

	const schemas: Record<string, SchemaType> = { post: postSchema, settings: settingsSchema };
	const collections: Record<string, ReturnType<typeof fakeCollection>> = {
		post: postCollection,
		settings: settingsCollection
	};

	const aphexCMS = {
		config: { schemaTypes: [postSchema, settingsSchema] },
		localAPI: {
			getCollectionNames: () => Object.keys(schemas),
			getCollectionSchema: (name: string) => schemas[name],
			getCollection: (name: string) => collections[name]
		},
		assetService: { findAssets, uploadAsset },
		databaseAdapter: { countAssets },
		partResolver: {
			agentToolsForCapabilities: (caps: string[]) =>
				pluginTools.filter(
					(t) =>
						!t.definition.requiredCapabilities?.length ||
						t.definition.requiredCapabilities.every((c) => caps.includes(c))
				)
		}
	} as unknown as CMSInstances;

	const context = {
		organizationId: 'org-1',
		auth: fakeAuth(capabilities)
	} as unknown as LocalAPIContext;

	const tools = buildContentTools({ aphexCMS, context });
	const byName = (name: string): McpTool => {
		const tool = tools.find((t) => t.name === name);
		if (!tool) throw new Error(`Tool not registered: ${name}`);
		return tool;
	};

	/**
	 * Runs a core tool whether or not it's listed for this caller, the way a client that
	 * calls a tool by name anyway would: the tool's own check is the last line.
	 */
	const runUnlisted = async (name: string, args: Record<string, unknown>) => {
		const tool = contentAgentTools.find((t) => t.definition.name === name);
		if (!tool) throw new Error(`No core tool named ${name}`);
		const result = await tool.execute(args, { aphexCMS, context });
		return result;
	};
	const listed = (name: string) => tools.some((t) => t.name === name);

	return {
		byName,
		runUnlisted,
		listed,
		postCollection,
		settingsCollection,
		findAssets,
		countAssets,
		uploadAsset
	};
}

describe('MCP content tools — smoke test every tool', () => {
	it('describe_cms returns document/object types without erroring', async () => {
		const { byName } = setup();
		const result = await byName('describe_cms').handler({});
		expect(result.isError).toBeFalsy();
	});

	it('list_collections lists every registered collection', async () => {
		const { byName } = setup();
		const result = await byName('list_collections').handler({});
		expect(result.isError).toBeFalsy();
		expect(result.content[0]?.text).toContain('post');
	});

	it('get_schema returns the schema for a known collection', async () => {
		const { byName } = setup();
		const result = await byName('get_schema').handler({ collection: 'post' });
		expect(result.isError).toBeFalsy();
	});

	it('get_schema fails for an unknown collection', async () => {
		const { byName } = setup();
		const result = await byName('get_schema').handler({ collection: 'nope' });
		expect(result.isError).toBe(true);
	});

	it('validate_document validates data against the real validator', async () => {
		const { byName } = setup();
		const result = await byName('validate_document').handler({
			collection: 'post',
			data: { title: 'Hello' }
		});
		expect(result.isError).toBeFalsy();
	});

	it('validate_schema validates a proposed schema against the real registry', async () => {
		const { byName } = setup();
		const result = await byName('validate_schema').handler({
			schema: {
				type: 'object',
				name: 'newType',
				title: 'New Type',
				fields: [{ name: 'label', type: 'string', title: 'Label' }]
			}
		});
		expect(result.isError).toBeFalsy();
	});

	it('query_documents calls collection.find', async () => {
		const { byName, postCollection } = setup();
		const result = await byName('query_documents').handler({ collection: 'post' });
		expect(result.isError).toBeFalsy();
		expect(postCollection.find).toHaveBeenCalledOnce();
	});

	describe('query_documents keeps one answer small', () => {
		const query = async (
			docs: unknown[],
			totalDocs: number,
			args: Record<string, unknown> = {}
		) => {
			const { byName, postCollection } = setup();
			postCollection.find.mockResolvedValue({ docs, totalDocs });
			const result = await byName('query_documents').handler({ collection: 'post', ...args });
			const text = result.content[0]?.type === 'text' ? result.content[0].text : '';
			return { text, body: JSON.parse(text), find: postCollection.find };
		};
		const doc = (n: number, length: number) => ({ id: `doc-${n}`, title: 'x'.repeat(length) });

		it('defaults to 20 and caps at 50', async () => {
			expect((await query([], 0)).find.mock.calls[0]?.[1]).toMatchObject({ limit: 20, offset: 0 });
			expect((await query([], 0, { limit: 900 })).find.mock.calls[0]?.[1]).toMatchObject({
				limit: 50
			});
		});

		it('stops early on large documents and says where to go on', async () => {
			const docs = [1, 2, 3, 4].map((n) => doc(n, 10_000));
			const { body, text } = await query(docs, 4, { offset: 0 });
			expect(body.docs).toHaveLength(2);
			expect(body).toMatchObject({ totalDocs: 4, hasMore: true, nextOffset: 2 });
			expect(body.note).toContain('skim');
			expect(text.length).toBeLessThan(25_000);
		});

		it('skims a first document that is too large on its own', async () => {
			const { body, text } = await query([doc(1, 90_000), doc(2, 10)], 2);
			expect(body.docs).toHaveLength(2);
			expect(body.hasMore).toBe(false);
			expect(body.note).toContain('get_document');
			expect(text.length).toBeLessThan(2_000);
		});

		it('says there is no more on the last page', async () => {
			const { body } = await query([doc(21, 5)], 21, { offset: 20 });
			expect(body).toMatchObject({ hasMore: false });
			expect(body).not.toHaveProperty('nextOffset');
			expect(body).not.toHaveProperty('note');
		});
	});

	it('a write answers with an outline of what was saved, not all of it', async () => {
		const { byName, postCollection } = setup();
		postCollection.update.mockResolvedValue({
			document: {
				id: 'doc-1',
				title: 'x'.repeat(5000),
				blocks: [{ _key: 'k1', _type: 'hero', heading: 'Hi', body: 'y'.repeat(5000) }],
				other: [{ _key: 'k2', _type: 'cta' }],
				total: 7,
				_meta: { revision: 4, status: 'draft' }
			},
			validation: { isValid: true, errors: [] }
		});
		const result = await byName('update_document').handler({
			collection: 'post',
			id: 'doc-1',
			data: { blocks: [] }
		});
		const body = JSON.parse(result.content[0]?.type === 'text' ? result.content[0].text : '');
		expect(body.document).toMatchObject({ id: 'doc-1', total: 7, _meta: { revision: 4 } });
		expect(body.document.blocks[0]).toMatchObject({ _key: 'k1', _type: 'hero' });
		expect(body.document).not.toHaveProperty('other');
		expect(body.validation.isValid).toBe(true);
		expect(JSON.stringify(body).length).toBeLessThan(600);
	});

	it('get_document skims a document too large to return whole, unless part is asked for', async () => {
		const { byName, postCollection } = setup();
		postCollection.findByID.mockResolvedValue({ id: 'doc-1', title: 'x'.repeat(60_000) });
		const read = async (args: Record<string, unknown>) => {
			const r = await byName('get_document').handler({ collection: 'post', id: 'doc-1', ...args });
			return r.content[0]?.type === 'text' ? r.content[0].text : '';
		};
		expect((await read({})).length).toBeLessThan(500);
		expect(await read({})).toContain('skimmed');
		expect((await read({ fields: ['title'] })).length).toBeGreaterThan(60_000);
	});

	it('get_document calls collection.findByID', async () => {
		const { byName, postCollection } = setup();
		const result = await byName('get_document').handler({ collection: 'post', id: 'doc-1' });
		expect(result.isError).toBeFalsy();
		expect(postCollection.findByID).toHaveBeenCalledWith(
			expect.anything(),
			'doc-1',
			expect.any(Object)
		);
	});

	it('create_document calls collection.create', async () => {
		const { byName, postCollection } = setup();
		const result = await byName('create_document').handler({
			collection: 'post',
			data: { title: 'Hello' }
		});
		expect(result.isError).toBeFalsy();
		expect(postCollection.create).toHaveBeenCalledOnce();
	});

	it('update_document calls collection.update', async () => {
		const { byName, postCollection } = setup();
		const result = await byName('update_document').handler({
			collection: 'post',
			id: 'doc-1',
			data: { title: 'Updated' }
		});
		expect(result.isError).toBeFalsy();
		expect(postCollection.update).toHaveBeenCalledOnce();
	});

	it('update_document threads expectedRevision through to collection.update as a CAS guard', async () => {
		const { byName, postCollection } = setup();
		await byName('update_document').handler({
			collection: 'post',
			id: 'doc-1',
			data: { title: 'Updated' },
			expectedRevision: 3
		});
		expect(postCollection.update).toHaveBeenCalledWith(
			expect.anything(),
			'doc-1',
			{ title: 'Updated' },
			expect.objectContaining({ expectedRevision: 3 })
		);
	});

	describe('patch_document', () => {
		const page = () => ({
			id: 'doc-1',
			title: 'Home',
			blocks: [
				{ _type: 'hero', _key: 'h1', heading: 'Hello' },
				{ _type: 'cta', _key: 'c1', heading: 'Visit' }
			],
			_meta: { revision: 7, status: 'draft' }
		});
		const saved = {
			document: { id: 'doc-1', _meta: { revision: 8, status: 'draft' } },
			validation: { isValid: true, errors: [] }
		};

		it('sends only the field it changed, guarded by the revision it read, and answers briefly', async () => {
			const { byName, postCollection } = setup();
			postCollection.findByID.mockResolvedValue(page());
			postCollection.update.mockResolvedValue(saved);
			const result = await byName('patch_document').handler({
				collection: 'post',
				id: 'doc-1',
				operations: [{ op: 'set', path: 'blocks[_key=="h1"].heading', value: 'Fresh bread' }]
			});
			expect(result.isError).toBeFalsy();
			const [, id, data, options] = postCollection.update.mock.calls[0];
			expect(id).toBe('doc-1');
			expect(Object.keys(data)).toEqual(['blocks']);
			expect(data.blocks[0].heading).toBe('Fresh bread');
			expect(data.blocks[1]).toEqual({ _type: 'cta', _key: 'c1', heading: 'Visit' });
			expect(options).toMatchObject({ expectedRevision: 7 });
			const text = JSON.stringify(result.content);
			expect(text).toMatch(/revision.{0,6}8/);
			expect(text).not.toContain('Fresh bread');
		});

		it('re-reads and re-applies once when someone saved in between', async () => {
			const { byName, postCollection } = setup();
			postCollection.findByID
				.mockResolvedValueOnce(page())
				.mockResolvedValueOnce({ ...page(), _meta: { revision: 9 } });
			postCollection.update
				.mockRejectedValueOnce(new RevisionConflictError('changed', 'doc-1', 7, 9))
				.mockResolvedValueOnce(saved);
			const result = await byName('patch_document').handler({
				collection: 'post',
				id: 'doc-1',
				operations: [{ op: 'unset', path: 'blocks[_key=="c1"]' }]
			});
			expect(result.isError).toBeFalsy();
			expect(postCollection.update).toHaveBeenCalledTimes(2);
			expect(postCollection.update.mock.calls[1][3]).toMatchObject({ expectedRevision: 9 });
		});

		it('does not retry over a revision the caller pinned', async () => {
			const { byName, postCollection } = setup();
			postCollection.findByID.mockResolvedValue(page());
			postCollection.update.mockRejectedValue(new RevisionConflictError('changed', 'doc-1', 5, 7));
			const result = await byName('patch_document').handler({
				collection: 'post',
				id: 'doc-1',
				expectedRevision: 5,
				operations: [{ op: 'set', path: 'title', value: 'x' }]
			});
			expect(result.isError).toBe(true);
			expect(postCollection.update).toHaveBeenCalledOnce();
		});

		it('finds a singleton without an id', async () => {
			const { byName, settingsCollection } = setup();
			settingsCollection.findByID.mockResolvedValue({
				id: 'settings',
				siteName: 'Old',
				_meta: { revision: 2 }
			});
			settingsCollection.update.mockResolvedValue(saved);
			const result = await byName('patch_document').handler({
				collection: 'settings',
				operations: [{ op: 'replaceText', path: 'siteName', find: 'Old', replace: 'New' }]
			});
			expect(result.isError).toBeFalsy();
			expect(settingsCollection.update).toHaveBeenCalledWith(
				expect.anything(),
				'settings',
				{ siteName: 'New' },
				expect.anything()
			);
		});

		it('says which operation failed and writes nothing', async () => {
			const { byName, postCollection } = setup();
			postCollection.findByID.mockResolvedValue(page());
			const result = await byName('patch_document').handler({
				collection: 'post',
				id: 'doc-1',
				operations: [
					{ op: 'set', path: 'title', value: 'x' },
					{ op: 'set', path: 'blocks[_key=="gone"].heading', value: 'y' }
				]
			});
			expect(result.isError).toBe(true);
			expect(JSON.stringify(result.content)).toContain('Operation 2: No item with _key');
			expect(postCollection.update).not.toHaveBeenCalled();
		});
	});

	it('publish_document calls collection.publish', async () => {
		const { byName, postCollection } = setup();
		const result = await byName('publish_document').handler({ collection: 'post', id: 'doc-1' });
		expect(result.isError).toBeFalsy();
		expect(postCollection.publish).toHaveBeenCalledOnce();
	});

	it('publish_document threads expectedRevision through to collection.publish as a CAS guard', async () => {
		const { byName, postCollection } = setup();
		await byName('publish_document').handler({
			collection: 'post',
			id: 'doc-1',
			expectedRevision: 5
		});
		expect(postCollection.publish).toHaveBeenCalledWith(
			expect.anything(),
			'doc-1',
			expect.objectContaining({ expectedRevision: 5 })
		);
	});

	it('get_singleton calls collection.get', async () => {
		const { byName, settingsCollection } = setup();
		const result = await byName('get_singleton').handler({ collection: 'settings' });
		expect(result.isError).toBeFalsy();
		expect(settingsCollection.get).toHaveBeenCalledOnce();
	});

	it('update_singleton resolves the singleton id and calls collection.update', async () => {
		const { byName, settingsCollection } = setup();
		const result = await byName('update_singleton').handler({
			collection: 'settings',
			data: { siteName: 'New Name' }
		});
		expect(result.isError).toBeFalsy();
		expect(settingsCollection.update).toHaveBeenCalledWith(
			expect.anything(),
			'settings',
			expect.any(Object),
			expect.any(Object)
		);
	});

	it('update_singleton fails for a non-singleton collection', async () => {
		const { byName } = setup();
		const result = await byName('update_singleton').handler({
			collection: 'post',
			data: { title: 'x' }
		});
		expect(result.isError).toBe(true);
	});

	describe('list_assets / upload_asset — authorization regression', () => {
		it('list_assets rejects a caller without asset.read, without touching assetService', async () => {
			const { listed, runUnlisted, findAssets } = setup([]);
			expect(listed('list_assets')).toBe(false);
			const result = await runUnlisted('list_assets', {});
			expect(result.success).toBe(false);
			expect(result.error).toMatch(/asset\.read/);
			expect(findAssets).not.toHaveBeenCalled();
		});

		it('list_assets succeeds for a caller with asset.read', async () => {
			const { byName, findAssets } = setup(['asset.read']);
			const result = await byName('list_assets').handler({});
			expect(result.isError).toBeFalsy();
			expect(findAssets).toHaveBeenCalledWith('org-1', expect.any(Object));
		});

		it('list_assets pages, caps the page and leaves out the stored row’s internals', async () => {
			const { byName, findAssets, countAssets } = setup(['asset.read']);
			findAssets.mockResolvedValue([
				{
					id: 'asset-1',
					originalFilename: 'front.jpg',
					mimeType: 'image/jpeg',
					size: 10,
					width: 4,
					height: 3,
					alt: 'The front',
					url: '/media/asset-1/front.jpg',
					path: 'internal/key',
					metadata: { exif: 'x'.repeat(2000) }
				}
			]);
			countAssets.mockResolvedValue(109);
			const result = await byName('list_assets').handler({ limit: 1000, offset: 25, search: 'fr' });
			expect(findAssets).toHaveBeenCalledWith(
				'org-1',
				expect.objectContaining({ limit: 50, offset: 25, search: 'fr' })
			);
			const body = JSON.parse(result.content[0]?.type === 'text' ? result.content[0].text : '');
			expect(body).toMatchObject({ total: 109, hasMore: true, nextOffset: 26 });
			expect(body.assets[0]).toEqual({
				id: 'asset-1',
				filename: 'front.jpg',
				mimeType: 'image/jpeg',
				size: 10,
				width: 4,
				height: 3,
				alt: 'The front',
				url: '/media/asset-1/front.jpg'
			});
		});

		it('list_assets says there are no more past the end', async () => {
			const { byName, countAssets } = setup(['asset.read']);
			countAssets.mockResolvedValue(3);
			const result = await byName('list_assets').handler({ offset: 50 });
			const body = JSON.parse(result.content[0]?.type === 'text' ? result.content[0].text : '');
			expect(body).toEqual({ assets: [], total: 3, hasMore: false });
		});

		it('upload_asset rejects a caller without asset.upload, without touching assetService', async () => {
			const { listed, runUnlisted, uploadAsset } = setup([]);
			expect(listed('upload_asset')).toBe(false);
			const result = await runUnlisted('upload_asset', {
				data: PNG_SIGNATURE.toString('base64'),
				filename: 'test.png'
			});
			expect(result.success).toBe(false);
			expect(result.error).toMatch(/asset\.upload/);
			expect(uploadAsset).not.toHaveBeenCalled();
		});

		it('upload_asset succeeds for a caller with asset.upload', async () => {
			const { byName, uploadAsset } = setup(['asset.upload']);
			const result = await byName('upload_asset').handler({
				data: PNG_SIGNATURE.toString('base64'),
				filename: 'test.png'
			});
			expect(result.isError).toBeFalsy();
			expect(uploadAsset).toHaveBeenCalledOnce();
		});

		it('upload_asset rejects both `data` and `url` provided together', async () => {
			const { byName, uploadAsset } = setup(['asset.upload']);
			const result = await byName('upload_asset').handler({
				data: PNG_SIGNATURE.toString('base64'),
				url: 'http://example.com/cover.png',
				filename: 'test.png'
			});
			expect(result.isError).toBe(true);
			expect(result.content[0]?.text).toMatch(/only one/i);
			expect(uploadAsset).not.toHaveBeenCalled();
		});

		it('upload_asset rejects when neither `data` nor `url` is provided', async () => {
			const { byName, uploadAsset } = setup(['asset.upload']);
			const result = await byName('upload_asset').handler({ filename: 'test.png' });
			expect(result.isError).toBe(true);
			expect(result.content[0]?.text).toMatch(/data.*url/i);
			expect(uploadAsset).not.toHaveBeenCalled();
		});

		it('upload_asset fetches from `url` server-side and derives a filename from it', async () => {
			vi.mocked(fetchRemoteFile).mockResolvedValueOnce({
				buffer: PNG_SIGNATURE,
				contentType: 'image/png'
			});
			const { byName, uploadAsset } = setup(['asset.upload']);
			const result = await byName('upload_asset').handler({
				url: 'https://cdn.example.com/photos/cover.png'
			});
			expect(result.isError).toBeFalsy();
			expect(fetchRemoteFile).toHaveBeenCalledWith('https://cdn.example.com/photos/cover.png');
			expect(uploadAsset).toHaveBeenCalledWith(
				'org-1',
				expect.objectContaining({ originalFilename: 'cover.png' })
			);
		});

		it('upload_asset surfaces a failed url fetch (e.g. the SSRF guard) as a tool error', async () => {
			vi.mocked(fetchRemoteFile).mockRejectedValueOnce(
				new Error('URL resolves to a private/internal address, which is not allowed.')
			);
			const { byName, uploadAsset } = setup(['asset.upload']);
			const result = await byName('upload_asset').handler({
				url: 'http://169.254.169.254/latest/meta-data/'
			});
			expect(result.isError).toBe(true);
			expect(result.content[0]?.text).toMatch(/private\/internal/);
			expect(uploadAsset).not.toHaveBeenCalled();
		});
	});

	describe('plugin-contributed aphex/agent/tool merge', () => {
		function fakePluginTool(name: string, requiredCapabilities: string[] = []): AgentToolPart {
			return {
				implements: 'aphex/agent/tool',
				definition: {
					name,
					description: 'A plugin tool',
					mutates: false,
					requiredCapabilities,
					execution: 'server',
					inputSchema: {} as never
				},
				execute: vi.fn().mockResolvedValue({ success: true, data: 'plugin-ran' })
			};
		}

		it('is included alongside the core tools when the caller has the required capability', async () => {
			const { byName } = setup(['custom.read'], [fakePluginTool('plugin_tool', ['custom.read'])]);
			const result = await byName('plugin_tool').handler({});
			expect(result.isError).toBeFalsy();
		});

		it('is not registered at all when the caller lacks the required capability', () => {
			const { byName } = setup([], [fakePluginTool('plugin_tool', ['custom.read'])]);
			expect(() => byName('plugin_tool')).toThrow(/not registered/);
		});

		it('a core tool name always wins over a same-named plugin tool', async () => {
			const { byName, uploadAsset } = setup(['asset.upload'], [fakePluginTool('upload_asset')]);
			const result = await byName('upload_asset').handler({
				data: PNG_SIGNATURE.toString('base64'),
				filename: 'test.png'
			});
			expect(result.isError).toBeFalsy();
			expect(uploadAsset).toHaveBeenCalledOnce();
		});
	});
});

describe('agent tool guidance', () => {
	it('describes Aphex slugs as bare strings in document queries', () => {
		const query = contentAgentTools.find((tool) => tool.definition.name === 'query_documents');
		expect(query?.definition.description).toContain('get_schema returns for that collection');
		expect(query?.definition.description).toContain('where: { "slug": "home" }');
		expect(query?.definition.description).toContain('never `slug.current`');
	});
});

describe('resolveAgentTools — documentContext gating for the workspace bridge', () => {
	function baseDeps(
		capabilities: string[] = ['document.update'],
		pluginTools: AgentToolPart[] = []
	) {
		const aphexCMS = {
			partResolver: {
				agentToolsForCapabilities: (caps: string[]) =>
					pluginTools.filter(
						(t) =>
							!t.definition.requiredCapabilities?.length ||
							t.definition.requiredCapabilities.every((c) => caps.includes(c))
					)
			}
		} as unknown as CMSInstances;
		const context = {
			organizationId: 'org-1',
			auth: fakeAuth(capabilities)
		} as unknown as LocalAPIContext;
		return { aphexCMS, context };
	}

	it('advertises content_patch_fields/content_save_draft only when a documentContext is given', () => {
		const { aphexCMS, context } = baseDeps(['document.read', 'document.create', 'document.update']);

		const withoutContext = resolveAgentTools({ aphexCMS, context });
		expect(withoutContext.some((t) => t.definition.name === 'content_patch_fields')).toBe(false);
		expect(withoutContext.some((t) => t.definition.name === 'content_save_draft')).toBe(false);

		const withContext = resolveAgentTools(
			{ aphexCMS, context },
			{ documentContext: { collection: 'post', id: 'doc-1' } }
		);
		expect(withContext.some((t) => t.definition.name === 'content_patch_fields')).toBe(true);
		expect(withContext.some((t) => t.definition.name === 'content_save_draft')).toBe(true);
		const patchTool = withContext.find((t) => t.definition.name === 'content_patch_fields');
		expect(patchTool?.definition.description).toContain('post/doc-1');
		expect(patchTool?.definition.description).toContain('cannot create a document');
		expect(
			withContext.find((t) => t.definition.name === 'create_document')?.definition.description
		).toContain('Create a NEW document in a collection');
	});

	it("lists only the core tools the caller's capabilities allow", () => {
		const { aphexCMS, context } = baseDeps(['document.read', 'document.update']);
		const names = resolveAgentTools({ aphexCMS, context }).map((t) => t.definition.name);
		expect(names).toContain('update_document');
		expect(names).not.toContain('publish_document');
		expect(names).not.toContain('create_document');
		expect(names).not.toContain('upload_asset');
	});

	it('never advertises a workspace-mode tool at all without a matching document context — not merely rejects it, absent entirely — even a plugin-contributed one', () => {
		const pluginWorkspaceTool: AgentToolPart = {
			implements: 'aphex/agent/tool',
			definition: {
				name: 'plugin_workspace_tool',
				description: 'A plugin tool that needs a live editor tab',
				mutates: true,
				requiredCapabilities: [],
				execution: 'workspace',
				inputSchema: {} as never
			},
			execute: vi.fn()
		};
		const { aphexCMS, context } = baseDeps([], [pluginWorkspaceTool]);

		const tools = resolveAgentTools({ aphexCMS, context });
		expect(tools.some((t) => t.definition.name === 'plugin_workspace_tool')).toBe(false);
	});

	it('removes update_document once a documentContext is given, so the workspace tools are the only way to edit the open document', () => {
		const { aphexCMS, context } = baseDeps();

		const withoutContext = resolveAgentTools({ aphexCMS, context });
		expect(withoutContext.some((t) => t.definition.name === 'update_document')).toBe(true);

		const withContext = resolveAgentTools(
			{ aphexCMS, context },
			{ documentContext: { collection: 'post', id: 'doc-1' } }
		);
		expect(withContext.some((t) => t.definition.name === 'update_document')).toBe(false);
	});
});
