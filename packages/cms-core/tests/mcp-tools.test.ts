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
import { buildContentTools, type McpTool } from '../src/lib/mcp/tools';
import type { CMSInstances } from '../src/lib/hooks';
import type { LocalAPIContext } from '../src/lib/local-api/types';
import type { ApiKeyAuth } from '../src/lib/types/auth';
import type { SchemaType } from '../src/lib/types/schemas';

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
	]
) {
	const findAssets = vi.fn().mockResolvedValue([]);
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
		assetService: { findAssets, uploadAsset }
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

	return { byName, postCollection, settingsCollection, findAssets, uploadAsset };
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

	it('publish_document calls collection.publish', async () => {
		const { byName, postCollection } = setup();
		const result = await byName('publish_document').handler({ collection: 'post', id: 'doc-1' });
		expect(result.isError).toBeFalsy();
		expect(postCollection.publish).toHaveBeenCalledOnce();
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
			const { byName, findAssets } = setup([]);
			const result = await byName('list_assets').handler({});
			expect(result.isError).toBe(true);
			expect(result.content[0]?.text).toMatch(/asset\.read/);
			expect(findAssets).not.toHaveBeenCalled();
		});

		it('list_assets succeeds for a caller with asset.read', async () => {
			const { byName, findAssets } = setup(['asset.read']);
			const result = await byName('list_assets').handler({});
			expect(result.isError).toBeFalsy();
			expect(findAssets).toHaveBeenCalledWith('org-1', expect.any(Object));
		});

		it('upload_asset rejects a caller without asset.upload, without touching assetService', async () => {
			const { byName, uploadAsset } = setup([]);
			const result = await byName('upload_asset').handler({
				data: PNG_SIGNATURE.toString('base64'),
				filename: 'test.png'
			});
			expect(result.isError).toBe(true);
			expect(result.content[0]?.text).toMatch(/asset\.upload/);
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
	});
});
