/**
 * Reference system tests — singular refs, array-of-refs, the reference
 * walker, and depth resolution.
 *
 * Run: pnpm test references
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createLocalAPI } from '@aphexcms/cms-core/server';
import { collectReferenceIds } from '../../packages/cms-core/src/lib/utils/reference-walk';
import { db } from '$lib/server/db';
import cmsConfig from '../aphex.config';
import { TEST_ORG_ID } from './helpers/test-constants';

let localAPI: ReturnType<typeof createLocalAPI>;
const ctx = { organizationId: TEST_ORG_ID, overrideAccess: true };

const createdIds: string[] = [];

beforeAll(async () => {
	localAPI = createLocalAPI(cmsConfig, db);
}, 30000);

afterAll(async () => {
	for (const id of createdIds) {
		try {
			await localAPI.deleteDocument(ctx, id);
		} catch {
			// ignore
		}
	}
});

describe('References - Data Shape', () => {
	it('singular reference stores as { _type, _ref }', async () => {
		const page = await localAPI.collections.page.create(
			ctx,
			{ title: 'Target Page', slug: 'target-page' },
			{ publish: true }
		);
		createdIds.push(page.document.id);

		const refDoc = await localAPI.collections.referenceToPage.create(ctx, {
			title: 'Ref Doc',
			pageReference: { _type: 'reference', _ref: page.document.id }
		});
		createdIds.push(refDoc.document.id);

		// Read at depth=0 — data has the wrapper
		const raw = await localAPI.collections.referenceToPage.findByID(ctx, refDoc.document.id);
		expect(raw).not.toBeNull();
		expect((raw as any).pageReference).toEqual({
			_type: 'reference',
			_ref: page.document.id
		});
	});

	it('array of references stores as [{ _type, _ref, _key }]', async () => {
		const item1 = await localAPI.collections.menuItem.create(ctx, {
			name: 'Burger',
			price: 12
		});
		const item2 = await localAPI.collections.menuItem.create(ctx, {
			name: 'Fries',
			price: 5
		});
		createdIds.push(item1.document.id, item2.document.id);

		const menu = await localAPI.collections.menu.create(ctx, {
			title: 'Lunch Menu',
			items: [
				{ _type: 'reference', _ref: item1.document.id, _key: 'k1' },
				{ _type: 'reference', _ref: item2.document.id, _key: 'k2' }
			]
		});
		createdIds.push(menu.document.id);

		const raw = await localAPI.collections.menu.findByID(ctx, menu.document.id);
		const items = (raw as any).items;
		expect(items).toHaveLength(2);
		expect(items[0]._type).toBe('reference');
		expect(items[0]._ref).toBe(item1.document.id);
		expect(items[1]._ref).toBe(item2.document.id);
	});
});

describe('References - Walker', () => {
	it('collectReferenceIds finds singular refs', () => {
		const data = {
			title: 'Test',
			author: { _type: 'reference', _ref: 'author-id-1' }
		};
		const ids = collectReferenceIds(data);
		expect(ids).toContain('author-id-1');
	});

	it('collectReferenceIds finds array refs', () => {
		const data = {
			items: [
				{ _type: 'reference', _ref: 'item-1', _key: 'k1' },
				{ _type: 'reference', _ref: 'item-2', _key: 'k2' }
			]
		};
		const ids = collectReferenceIds(data);
		expect(ids).toContain('item-1');
		expect(ids).toContain('item-2');
	});

	it('collectReferenceIds finds nested refs', () => {
		const data = {
			content: [
				{
					_type: 'richContentBlock',
					sections: [
						{
							columns: [
								{
									relatedPage: { _type: 'reference', _ref: 'page-1' },
									featuredProduct: { _type: 'reference', _ref: 'product-1' }
								}
							]
						}
					]
				}
			]
		};
		const ids = collectReferenceIds(data);
		expect(ids).toContain('page-1');
		expect(ids).toContain('product-1');
	});

	it('collectReferenceIds deduplicates', () => {
		const data = {
			ref1: { _type: 'reference', _ref: 'same-id' },
			ref2: { _type: 'reference', _ref: 'same-id' }
		};
		const ids = collectReferenceIds(data);
		expect(ids).toEqual(['same-id']);
	});
});

describe('References - Depth Resolution', () => {
	it('depth=1 resolves singular reference to full document', async () => {
		const page = await localAPI.collections.page.create(
			ctx,
			{ title: 'Resolved Page', slug: 'resolved-page' },
			{ publish: true }
		);
		createdIds.push(page.document.id);

		const refDoc = await localAPI.collections.referenceToPage.create(
			ctx,
			{
				title: 'Resolved Ref',
				pageReference: { _type: 'reference', _ref: page.document.id }
			},
			{ publish: true }
		);
		createdIds.push(refDoc.document.id);

		const result = await localAPI.collections.referenceToPage.findByID(ctx, refDoc.document.id, {
			depth: 1,
			perspective: 'published'
		});
		expect(result).not.toBeNull();
		// At depth=1 the ref is replaced with the resolved doc
		const resolved = (result as any).pageReference;
		expect(resolved.id).toBe(page.document.id);
	});

	it('depth=1 resolves array of references', async () => {
		const item = await localAPI.collections.menuItem.create(
			ctx,
			{ name: 'Salad', price: 8 },
			{ publish: true }
		);
		createdIds.push(item.document.id);

		const menu = await localAPI.collections.menu.create(
			ctx,
			{
				title: 'Depth Array Menu',
				items: [{ _type: 'reference', _ref: item.document.id, _key: 'dk1' }]
			},
			{ publish: true }
		);
		createdIds.push(menu.document.id);

		const result = await localAPI.collections.menu.findByID(ctx, menu.document.id, {
			depth: 1,
			perspective: 'published'
		});
		const items = (result as any).items;
		expect(items).toHaveLength(1);
		expect(items[0].id).toBe(item.document.id);
	});
});

describe('References - Publish Guard (server-side)', () => {
	it('blocks publish when a singular reference target is unpublished', async () => {
		const page = await localAPI.collections.page.create(ctx, {
			title: 'Draft Target',
			slug: 'draft-target'
		});
		createdIds.push(page.document.id);

		const refDoc = await localAPI.collections.referenceToPage.create(ctx, {
			title: 'Wants to Publish',
			pageReference: { _type: 'reference', _ref: page.document.id }
		});
		createdIds.push(refDoc.document.id);

		await expect(
			localAPI.collections.referenceToPage.publish(ctx, refDoc.document.id)
		).rejects.toThrow(/not published/);
	});

	it('blocks publish when an array reference target is unpublished', async () => {
		const publishedItem = await localAPI.collections.menuItem.create(
			ctx,
			{ name: 'Published Item', price: 10 },
			{ publish: true }
		);
		const draftItem = await localAPI.collections.menuItem.create(ctx, {
			name: 'Draft Item',
			price: 5
		});
		createdIds.push(publishedItem.document.id, draftItem.document.id);

		const menu = await localAPI.collections.menu.create(ctx, {
			title: 'Mixed Menu',
			items: [
				{ _type: 'reference', _ref: publishedItem.document.id, _key: 'p1' },
				{ _type: 'reference', _ref: draftItem.document.id, _key: 'd1' }
			]
		});
		createdIds.push(menu.document.id);

		await expect(localAPI.collections.menu.publish(ctx, menu.document.id)).rejects.toThrow(
			/not published/
		);
	});

	it('allows publish when all reference targets are published', async () => {
		const item = await localAPI.collections.menuItem.create(
			ctx,
			{ name: 'Ready Item', price: 15 },
			{ publish: true }
		);
		createdIds.push(item.document.id);

		const menu = await localAPI.collections.menu.create(ctx, {
			title: 'Good Menu',
			items: [{ _type: 'reference', _ref: item.document.id, _key: 'g1' }]
		});
		createdIds.push(menu.document.id);

		const result = await localAPI.collections.menu.publish(ctx, menu.document.id);
		expect(result).toBeDefined();
	});

	it('collectReferenceIds finds all ref IDs in doc data', () => {
		const data = {
			title: 'Mixed',
			items: [
				{ _type: 'reference', _ref: 'id-1', _key: 'p1' },
				{ _type: 'reference', _ref: 'id-2', _key: 'd1' }
			],
			author: { _type: 'reference', _ref: 'id-3' }
		};
		const refIds = collectReferenceIds(data);
		expect(refIds).toContain('id-1');
		expect(refIds).toContain('id-2');
		expect(refIds).toContain('id-3');
	});
});
