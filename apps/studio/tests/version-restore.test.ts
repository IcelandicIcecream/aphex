import { describe, expect, it } from 'vitest';
import { ALL_CAPABILITIES, type Auth, type SchemaType } from '@aphexcms/cms-core';
import { createLocalAPI } from '@aphexcms/cms-core/server';
import { db } from './helpers/db';
import cmsConfig from './fixtures/config';
import { TEST_ORG_ID } from './helpers/test-constants';

/**
 * A version restore is a draft save, so it gets everything a save gets: the
 * indexes follow it, and it is refused to whoever couldn't make that save (or
 * read that version) in the first place.
 */
const note: SchemaType = {
	type: 'document',
	name: 'vrNote',
	title: 'Note',
	fields: [
		{ name: 'title', type: 'string', title: 'Title' },
		{ name: 'image', type: 'image', title: 'Image' },
		{ name: 'subtitle', type: 'string', title: 'Subtitle' },
		{ name: 'secret', type: 'string', title: 'Secret', access: { read: ['owner'] } }
	]
};

const product: SchemaType = {
	type: 'document',
	name: 'vrProduct',
	title: 'Product',
	requiredCapabilities: ['site.shop'],
	fields: [{ name: 'title', type: 'string', title: 'Title' }]
};

const api = createLocalAPI({ ...cmsConfig, schemaTypes: [note, product], plugins: [] }, db);
const notes = api.getCollection('vrNote')!;
const products = api.getCollection('vrProduct')!;
const system = { organizationId: TEST_ORG_ID, overrideAccess: true };

function member(role: 'owner' | 'editor', features: string[] = []) {
	const auth: Auth = {
		type: 'session',
		user: { id: 'user-1', email: 'member@example.com', name: 'Member', role: 'user' },
		session: { id: 's', expiresAt: new Date(Date.now() + 60_000) },
		organizationId: TEST_ORG_ID,
		organizationRole: role,
		capabilities: [...ALL_CAPABILITIES, ...features]
	} as Auth;
	return { organizationId: TEST_ORG_ID, auth };
}

async function mkAsset(name: string) {
	const asset = await db.createAsset({
		organizationId: TEST_ORG_ID,
		assetType: 'image',
		filename: name,
		originalFilename: name,
		mimeType: 'image/png',
		size: 10,
		url: `/assets/${name}`,
		path: `assets/${name}`,
		storageAdapter: 'local',
		createdBy: 'user-1'
	});
	return asset.id;
}

const image = (id: string) => ({ _type: 'image', asset: { _type: 'reference', _ref: id } });
const idOf = (result: { document: unknown } | null) => (result!.document as { id: string }).id;

async function planes(assetId: string) {
	const rows = await db.findAssetReferenceFieldPaths!(TEST_ORG_ID, assetId);
	return rows.map((r) => r.plane).sort();
}

async function oldest(id: string) {
	const list = await notes.listVersions(system, id, { limit: 100 });
	return list!.versions.at(-1)!;
}

describe('restoring a version', () => {
	it('re-indexes the draft: assets and search follow the restored data', async () => {
		const first = await mkAsset('vr-first.png');
		const second = await mkAsset('vr-second.png');
		const id = idOf(await notes.create(system, { title: 'Quokkaword', image: image(first) }));
		await notes.update(system, id, { title: 'Wombatword', image: image(second) });

		expect(await planes(first)).toEqual([]);
		await notes.restoreVersion(system, id, (await oldest(id)).versionNumber);

		expect(await planes(first)).toEqual(['draft']);
		expect(await planes(second)).toEqual([]);
		const found = await notes.find(system, { search: 'Quokkaword', perspective: 'draft' });
		expect(found.docs.map((d) => (d as { id: string }).id)).toContain(id);
	});

	it('replaces the draft: a field set since comes back empty', async () => {
		const id = idOf(await notes.create(system, { title: 'Before' }));
		await notes.update(system, id, { subtitle: 'Added later' });

		const restored = await notes.restoreVersion(system, id, (await oldest(id)).versionNumber);
		expect((restored!.document as Record<string, unknown>).subtitle).toBeUndefined();
	});

	it('returns null for a version or document that does not exist', async () => {
		const id = idOf(await notes.create(system, { title: 'Lonely' }));
		expect(await notes.restoreVersion(system, id, 9999)).toBeNull();
		expect(
			await notes.restoreVersion(system, '00000000-0000-0000-0000-000000000000', 1)
		).toBeNull();
	});
});

describe('version access', () => {
	it('refuses the history of a type the organization lacks', async () => {
		const id = idOf(await products.create(member('owner', ['site.shop']), { title: 'Mug' }));

		await expect(products.listVersions(member('owner'), id)).rejects.toThrow("isn't available");
		await expect(products.getVersion(member('owner'), id, 1)).rejects.toThrow("isn't available");
		await expect(products.restoreVersion(member('owner'), id, 1)).rejects.toThrow(
			"isn't available"
		);
		expect((await products.listVersions(member('owner', ['site.shop']), id))!.total).toBe(1);
	});

	it("doesn't answer for a document of another type", async () => {
		const id = idOf(await notes.create(system, { title: 'A note' }));
		expect(await products.listVersions(system, id)).toBeNull();
	});

	it('leaves out fields the caller may not read', async () => {
		const id = idOf(await notes.create(system, { title: 'Mixed', secret: 'owners only' }));

		const asEditor = await notes.listVersions(member('editor'), id);
		expect(asEditor!.versions[0].data.secret).toBeUndefined();
		const one = await notes.getVersion(member('editor'), id, asEditor!.versions[0].versionNumber);
		expect(one!.data.secret).toBeUndefined();

		const asOwner = await notes.listVersions(member('owner'), id);
		expect(asOwner!.versions[0].data.secret).toBe('owners only');
	});
});
