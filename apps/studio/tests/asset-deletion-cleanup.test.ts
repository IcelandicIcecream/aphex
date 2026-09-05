import { describe, it, expect, vi } from 'vitest';
import { AssetService } from '@aphexcms/cms-core/server';

/**
 * Deleting an asset has to take its derivatives with it.
 *
 * Every generated variant is a separate object that nothing will ever refer to
 * again once the original is gone. Leaking them is invisible — no error, no
 * broken image, just a bucket that only ever grows — which is exactly why it
 * needs a test rather than a manual check.
 *
 * The two recovery paths are tested separately because they cover different
 * gaps and one is optional on the port:
 *
 * - `listObjects` finds everything under `{assetId}/`, including derivatives
 *   generated under a config that has since changed and which the database has
 *   no record of at all.
 * - The recorded variants are the fallback for adapters that can't list (the
 *   local filesystem adapter doesn't implement it).
 */

const ASSET_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

type Options = {
	listObjects?: (opts: { prefix?: string }) => Promise<{ objects: { key: string }[] }>;
	metadata?: Record<string, unknown> | null;
	storageAdapterName?: string;
	path?: string;
};

function makeService(options: Options = {}) {
	const {
		listObjects,
		metadata = null,
		storageAdapterName = 'test',
		path = `${ASSET_ID}/original.png`
	} = options;

	const asset = {
		id: ASSET_ID,
		organizationId: 'org1',
		path,
		storageAdapter: storageAdapterName,
		assetType: 'image',
		mimeType: 'image/png',
		metadata
	};

	const deleted: string[] = [];
	const del = vi.fn(async (p: string) => {
		deleted.push(p);
		return true;
	});

	const storage: Record<string, unknown> = { name: 'test', delete: del };
	if (listObjects) storage.listObjects = vi.fn(listObjects);

	const database = {
		findAssetById: vi.fn(async () => asset),
		deleteAsset: vi.fn(async () => true)
	} as any;

	return {
		service: new AssetService(storage as any, database, null),
		deleted,
		database,
		storage
	};
}

/** A variant record as `recordVariant` writes it. */
function variantRecord(widths: number[], config = 'cfg1') {
	return {
		variants: {
			config,
			generatedAt: new Date().toISOString(),
			widths: widths.map((w) => ({
				w,
				h: Math.round(w * 0.75),
				key: `${ASSET_ID}/w${w}-${config}.webp`,
				path: `${ASSET_ID}/w${w}-${config}.webp`,
				url: `/media/${ASSET_ID}/w${w}-${config}.webp`,
				bytes: w * 100
			}))
		}
	};
}

describe('deleteAsset storage cleanup', () => {
	it('deletes derivatives listed under the asset prefix', async () => {
		const { service, deleted, storage } = makeService({
			listObjects: async () => ({
				objects: [
					{ key: `${ASSET_ID}/original.png` },
					{ key: `${ASSET_ID}/w320-cfg1.webp` },
					{ key: `${ASSET_ID}/w640-cfg1.webp` }
				]
			})
		});

		await service.deleteAsset('org1', ASSET_ID);

		expect(storage.listObjects).toHaveBeenCalledWith({ prefix: `${ASSET_ID}/` });
		expect(deleted.sort()).toEqual(
			[
				`${ASSET_ID}/original.png`,
				`${ASSET_ID}/w320-cfg1.webp`,
				`${ASSET_ID}/w640-cfg1.webp`
			].sort()
		);
	});

	it('deletes derivatives the database no longer records', async () => {
		// The whole point of listing: `recordVariant` replaces the record wholesale
		// when the config hash moves, so a variant generated under the old config
		// is referenced by nothing. Only a prefix listing can still find it.
		const { service, deleted } = makeService({
			metadata: variantRecord([320], 'cfg2'),
			listObjects: async () => ({
				objects: [
					{ key: `${ASSET_ID}/original.png` },
					{ key: `${ASSET_ID}/w320-cfg2.webp` },
					{ key: `${ASSET_ID}/w960-STALE.webp` }
				]
			})
		});

		await service.deleteAsset('org1', ASSET_ID);

		expect(deleted).toContain(`${ASSET_ID}/w960-STALE.webp`);
	});

	it('falls back to the recorded variants when the adapter cannot list', async () => {
		const { service, deleted } = makeService({ metadata: variantRecord([320, 640]) });

		await service.deleteAsset('org1', ASSET_ID);

		expect(deleted.sort()).toEqual(
			[
				`${ASSET_ID}/original.png`,
				`${ASSET_ID}/w320-cfg1.webp`,
				`${ASSET_ID}/w640-cfg1.webp`
			].sort()
		);
	});

	it('never deletes the same object twice', async () => {
		// The original appears in both sources; the recorded variants and the
		// listing overlap too.
		const { service, deleted } = makeService({
			metadata: variantRecord([320]),
			listObjects: async () => ({
				objects: [{ key: `${ASSET_ID}/original.png` }, { key: `${ASSET_ID}/w320-cfg1.webp` }]
			})
		});

		await service.deleteAsset('org1', ASSET_ID);

		expect(new Set(deleted).size).toBe(deleted.length);
	});

	it('still removes the row when a storage delete fails', async () => {
		const { service, database } = makeService({
			listObjects: async () => ({ objects: [{ key: `${ASSET_ID}/w320-cfg1.webp` }] })
		});
		(service as any).storage.delete = vi.fn(async () => {
			throw new Error('bucket unreachable');
		});

		await expect(service.deleteAsset('org1', ASSET_ID)).resolves.toBe(true);
		expect(database.deleteAsset).toHaveBeenCalled();
	});

	it('still deletes the original when listing fails', async () => {
		const { service, deleted } = makeService({
			metadata: variantRecord([320]),
			listObjects: async () => {
				throw new Error('listing not permitted');
			}
		});

		await service.deleteAsset('org1', ASSET_ID);

		// A failed listing costs orphaned derivatives, not a failed delete.
		expect(deleted).toContain(`${ASSET_ID}/original.png`);
		expect(deleted).toContain(`${ASSET_ID}/w320-cfg1.webp`);
	});

	it('does not derive a prefix for a flat-layout asset', async () => {
		// Pre-dates the id-directory layout: the path has no relationship to the
		// id, so a `{id}/` prefix would match nothing — or something unrelated.
		const listObjects = vi.fn(async () => ({ objects: [] }));
		const { service, deleted } = makeService({
			path: 'uploads/1699999-photo.png',
			listObjects
		});

		await service.deleteAsset('org1', ASSET_ID);

		expect(listObjects).not.toHaveBeenCalled();
		expect(deleted).toEqual(['uploads/1699999-photo.png']);
	});

	it('skips storage entirely when another adapter stored the file', async () => {
		const { service, deleted, database } = makeService({
			storageAdapterName: 'some-other-adapter'
		});

		await service.deleteAsset('org1', ASSET_ID);

		expect(deleted).toEqual([]);
		expect(database.deleteAsset).toHaveBeenCalled();
	});
});
