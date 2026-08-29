import { describe, it, expect, vi } from 'vitest';
import { AssetService, resolveImageConfig, type ImageConfig } from '@aphexcms/cms-core/server';

/**
 * `AssetService.injectAssetUrls` runs on every public page render — it's what
 * turns `{ asset: { _ref } }` into something with a `url` on it. That makes it
 * the hottest read path in the CMS, and the place where an N+1 costs the most:
 * on a serverless deployment the database is remote and reached through a small
 * pool, so per-ref queries queue rather than run concurrently.
 *
 * These tests pin the batching itself, not just the output, because the
 * observable result (images have URLs) is identical whether it took 1 query or
 * 50. Only the call count distinguishes them.
 */

type AssetRow = {
	id: string;
	url: string | null;
	alt?: string | null;
	width?: number | null;
	height?: number | null;
	assetType?: string;
	mimeType?: string;
};

function makeService(rows: AssetRow[], images: ImageConfig | null = null) {
	const findManyAssetsAdvanced = vi.fn(async (_orgId: string, options: any) => {
		const ids: string[] = options?.where?.id?.in ?? [];
		const limit: number = options?.limit ?? 20;
		const matched = rows.filter((r) => ids.includes(r.id));
		// Mirror the real adapters: `limit` genuinely truncates. A test double
		// that ignored it would pass while production silently dropped images.
		return { docs: matched.slice(0, limit), totalDocs: matched.length };
	});

	const database = { findManyAssetsAdvanced } as any;
	const storage = { name: 'test' } as any;
	return { service: new AssetService(storage, database, images), findManyAssetsAdvanced };
}

function imageDoc(...refs: string[]) {
	return { blocks: refs.map((ref) => ({ _type: 'image', asset: { _ref: ref } })) };
}

const rowsFor = (n: number): AssetRow[] =>
	Array.from({ length: n }, (_, i) => ({
		id: `a${i}`,
		url: `/media/a${i}/f.png`,
		assetType: 'image',
		mimeType: 'image/png',
		width: 4000,
		height: 3000
	}));

const refsFor = (n: number) => Array.from({ length: n }, (_, i) => `a${i}`);

describe('injectAssetUrls batching', () => {
	it('resolves many refs in a single query', async () => {
		const { service, findManyAssetsAdvanced } = makeService(rowsFor(10));
		const doc = imageDoc(...refsFor(10));

		await service.injectAssetUrls('org1', doc);

		expect(findManyAssetsAdvanced).toHaveBeenCalledTimes(1);
		expect(doc.blocks.every((b: any) => typeof b.asset.url === 'string')).toBe(true);
	});

	it('resolves more refs than the adapter’s default limit', async () => {
		// The adapters default `limit` to 20. Omitting an explicit limit would
		// truncate here with no error at all — the 21st image onward would just
		// render blank, and only on pages carrying that many images.
		const { service, findManyAssetsAdvanced } = makeService(rowsFor(25));
		const doc = imageDoc(...refsFor(25));

		await service.injectAssetUrls('org1', doc);

		expect(findManyAssetsAdvanced).toHaveBeenCalledTimes(1);
		const passedLimit = findManyAssetsAdvanced.mock.calls[0][1].limit;
		expect(passedLimit).toBe(25);
		expect(doc.blocks.filter((b: any) => b.asset.url).length).toBe(25);
	});

	it('splits very large ref sets into bounded batches', async () => {
		// SQLite caps bound parameters per statement, so an unbounded IN(...)
		// turns a slow page into a hard query error.
		const { service, findManyAssetsAdvanced } = makeService(rowsFor(250));
		const doc = imageDoc(...refsFor(250));

		await service.injectAssetUrls('org1', doc);

		expect(findManyAssetsAdvanced).toHaveBeenCalledTimes(2);
		for (const [, options] of findManyAssetsAdvanced.mock.calls) {
			expect(options.where.id.in.length).toBeLessThanOrEqual(200);
			expect(options.limit).toBe(options.where.id.in.length);
		}
		expect(doc.blocks.filter((b: any) => b.asset.url).length).toBe(250);
	});

	it('de-duplicates a ref used many times', async () => {
		const { service, findManyAssetsAdvanced } = makeService(rowsFor(1));
		const doc = imageDoc('a0', 'a0', 'a0');

		await service.injectAssetUrls('org1', doc);

		expect(findManyAssetsAdvanced.mock.calls[0][1].where.id.in).toEqual(['a0']);
		expect(doc.blocks.every((b: any) => b.asset.url === '/media/a0/f.png')).toBe(true);
	});

	it('issues no query when there is nothing to resolve', async () => {
		const { service, findManyAssetsAdvanced } = makeService(rowsFor(3));

		await service.injectAssetUrls('org1', { title: 'no images here' });

		expect(findManyAssetsAdvanced).not.toHaveBeenCalled();
	});

	it('resolves refs spread across several documents in one query', async () => {
		const { service, findManyAssetsAdvanced } = makeService(rowsFor(4));
		const a = imageDoc('a0', 'a1');
		const b = imageDoc('a2', 'a3');

		await service.injectAssetUrls('org1', a, b);

		expect(findManyAssetsAdvanced).toHaveBeenCalledTimes(1);
		expect(a.blocks.every((x: any) => x.asset.url)).toBe(true);
		expect(b.blocks.every((x: any) => x.asset.url)).toBe(true);
	});
});

describe('injectAssetUrls resilience', () => {
	it('leaves an unknown ref unresolved rather than throwing', async () => {
		const { service } = makeService(rowsFor(1));
		const doc = imageDoc('a0', 'missing');

		await service.injectAssetUrls('org1', doc);

		expect((doc.blocks[0] as any).asset.url).toBe('/media/a0/f.png');
		expect((doc.blocks[1] as any).asset.url).toBeUndefined();
	});

	it('skips an asset row with no url', async () => {
		const { service } = makeService([{ id: 'a0', url: null }]);
		const doc = imageDoc('a0');

		await service.injectAssetUrls('org1', doc);

		expect((doc.blocks[0] as any).asset.url).toBeUndefined();
	});

	it('does not fail the page load when the query throws', async () => {
		// A failing batched query loses every ref rather than one, but it only
		// fails when the database is unreachable — in which case the per-ref
		// version would have lost every ref too. What must not happen is the
		// whole page render throwing.
		const database = {
			findManyAssetsAdvanced: vi.fn(async () => {
				throw new Error('connection terminated');
			})
		} as any;
		const service = new AssetService({ name: 'test' } as any, database);
		const doc = imageDoc('a0');

		await expect(service.injectAssetUrls('org1', doc)).resolves.toBeUndefined();
		expect((doc.blocks[0] as any).asset.url).toBeUndefined();
	});

	it('injects nothing responsive when the pipeline is off', async () => {
		// The default construction has no image config, which must behave exactly
		// as it did before the pipeline existed.
		const { service } = makeService(rowsFor(1));
		const doc = imageDoc('a0');

		await service.injectAssetUrls('org1', doc);

		expect((doc.blocks[0] as any).asset.url).toBe('/media/a0/f.png');
		expect((doc.blocks[0] as any).asset.srcset).toBeUndefined();
	});

	it('injects default alt text when the asset carries it', async () => {
		const { service } = makeService([{ id: 'a0', url: '/media/a0/f.png', alt: 'a cat' }]);
		const doc = imageDoc('a0');

		await service.injectAssetUrls('org1', doc);

		expect((doc.blocks[0] as any).asset.alt).toBe('a cat');
	});
});

/**
 * The `srcset` is built server-side during injection rather than in `<Image>`.
 *
 * Constructing a variant URL needs the width ladder and the config hash, so the
 * choice is between shipping both to the browser or shipping the finished
 * string. The string is smaller and keeps one place responsible for how a
 * derivative is addressed.
 */
describe('injectAssetUrls responsive data', () => {
	const images = resolveImageConfig({ widths: [320, 640, 1280], quality: 80 })!;

	it('injects a srcset covering the ladder', async () => {
		const { service } = makeService(rowsFor(1), images);
		const doc = imageDoc('a0');

		await service.injectAssetUrls('org1', doc);

		const asset = (doc.blocks[0] as any).asset;
		expect(asset.srcset).toContain('320w');
		expect(asset.srcset).toContain('640w');
		expect(asset.srcset).toContain('1280w');
		// Variant URLs carry no part of the user's filename, so renaming the
		// asset can never invalidate them.
		expect(asset.srcset).not.toContain('f.png');
	});

	it('injects intrinsic dimensions so layout can be reserved', async () => {
		const { service } = makeService(rowsFor(1), images);
		const doc = imageDoc('a0');

		await service.injectAssetUrls('org1', doc);

		expect((doc.blocks[0] as any).asset.width).toBe(4000);
		expect((doc.blocks[0] as any).asset.height).toBe(3000);
	});

	it('never offers a width above the original', async () => {
		// Upscaling produces a larger file that looks no better.
		const { service } = makeService(
			[{ id: 'a0', url: '/media/a0/f.png', assetType: 'image', mimeType: 'image/png', width: 500 }],
			images
		);
		const doc = imageDoc('a0');

		await service.injectAssetUrls('org1', doc);

		const asset = (doc.blocks[0] as any).asset;
		expect(asset.srcset).toContain('320w');
		expect(asset.srcset).not.toContain('640w');
		expect(asset.srcset).not.toContain('1280w');
	});

	it('skips SVG, which is already resolution-independent', async () => {
		// Rasterising an SVG to a fixed ladder makes it strictly worse.
		const { service } = makeService(
			[
				{
					id: 'a0',
					url: '/media/a0/logo.svg',
					assetType: 'image',
					mimeType: 'image/svg+xml',
					width: 100
				}
			],
			images
		);
		const doc = imageDoc('a0');

		await service.injectAssetUrls('org1', doc);

		expect((doc.blocks[0] as any).asset.srcset).toBeUndefined();
		expect((doc.blocks[0] as any).asset.url).toBe('/media/a0/logo.svg');
	});

	it('skips non-image assets', async () => {
		const { service } = makeService(
			[{ id: 'a0', url: '/media/a0/doc.pdf', assetType: 'file', mimeType: 'application/pdf' }],
			images
		);
		const doc = imageDoc('a0');

		await service.injectAssetUrls('org1', doc);

		expect((doc.blocks[0] as any).asset.srcset).toBeUndefined();
	});
});
