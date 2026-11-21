import { describe, expect, it } from 'vitest';
import type { SchemaType } from '@aphexcms/cms-core';
import { createLocalAPI } from '@aphexcms/cms-core/server';
import { db } from './helpers/db';
import cmsConfig from './fixtures/config';
import { TEST_ORG_ID } from './helpers/test-constants';

/**
 * The asset index records each document's draft and published assets as two
 * planes. A publish rewrites only the published data, and the index has to
 * follow it in the same write: otherwise an asset the publish dropped still
 * reads as in use, and the "Unused" filter never offers it.
 */
const schema: SchemaType = {
	type: 'document',
	name: 'planeProbe',
	title: 'Plane probe',
	fields: [
		{ name: 'title', type: 'string', title: 'Title' },
		{ name: 'image', type: 'image', title: 'Image' }
	]
};

const ctx = { organizationId: TEST_ORG_ID, overrideAccess: true };

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

async function planes(assetId: string) {
	const rows = await db.findAssetReferenceFieldPaths!(TEST_ORG_ID, assetId);
	return rows.map((r) => r.plane).sort();
}

describe.each([
	['versioned', false],
	['unversioned', true]
])('asset reference planes (%s)', (_label, skipVersioning) => {
	const api = createLocalAPI({ ...cmsConfig, schemaTypes: [schema], plugins: [] }, db);
	const probes = api.getCollection('planeProbe')!;
	const suffix = skipVersioning ? 'u' : 'v';

	it('moves the published plane to the new asset when a save publishes', async () => {
		const first = await mkAsset(`first-${suffix}.png`);
		const second = await mkAsset(`second-${suffix}.png`);
		const created = await probes.create(
			ctx,
			{ title: 'A', image: image(first) },
			{
				publish: true,
				skipVersioning
			}
		);
		const id = (created.document as { id: string }).id;
		expect(await planes(first)).toEqual(['draft', 'published']);

		await probes.update(ctx, id, { image: image(second) }, { publish: true, skipVersioning });

		expect(await planes(first)).toEqual([]);
		expect(await planes(second)).toEqual(['draft', 'published']);
	});

	it('follows a publish on its own, and keeps the published plane through a soft unpublish', async () => {
		const first = await mkAsset(`solo-first-${suffix}.png`);
		const second = await mkAsset(`solo-second-${suffix}.png`);
		const created = await probes.create(
			ctx,
			{ title: 'B', image: image(first) },
			{
				publish: true,
				skipVersioning
			}
		);
		const id = (created.document as { id: string }).id;

		// A draft save leaves the live page alone: both assets are in use.
		await probes.update(ctx, id, { image: image(second) }, { skipVersioning });
		expect(await planes(first)).toEqual(['published']);
		expect(await planes(second)).toEqual(['draft']);

		await probes.publish(ctx, id);
		expect(await planes(first)).toEqual([]);
		expect(await planes(second)).toEqual(['draft', 'published']);

		// Unpublish keeps the published data, and the index records stored data
		// whatever the status, as the delete guard does.
		await probes.unpublish(ctx, id);
		expect(await planes(second)).toEqual(['draft', 'published']);
	});
});
