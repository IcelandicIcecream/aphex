import { describe, it, expect, vi } from 'vitest';
import { AssetService } from '@aphexcms/cms-core/server';

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

type AssetRow = { id: string; url: string | null; alt?: string | null };

function makeService(rows: AssetRow[]) {
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
	return { service: new AssetService(storage, database), findManyAssetsAdvanced };
}

function imageDoc(...refs: string[]) {
	return { blocks: refs.map((ref) => ({ _type: 'image', asset: { _ref: ref } })) };
}

const rowsFor = (n: number): AssetRow[] =>
	Array.from({ length: n }, (_, i) => ({ id: `a${i}`, url: `/media/a${i}/f.png` }));

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

	it('injects default alt text when the asset carries it', async () => {
		const { service } = makeService([{ id: 'a0', url: '/media/a0/f.png', alt: 'a cat' }]);
		const doc = imageDoc('a0');

		await service.injectAssetUrls('org1', doc);

		expect((doc.blocks[0] as any).asset.alt).toBe('a cat');
	});
});
