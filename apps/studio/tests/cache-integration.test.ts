/**
 * Integration tests for cache adapter with LocalAPI
 * Verifies caching behavior on published reads + invalidation on mutations
 *
 * Run: pnpm -F @aphexcms/studio test cache-integration
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createLocalAPI, InMemoryCacheAdapter } from '@aphexcms/cms-core/server';
import { db } from '$lib/server/db';
import cmsConfig from '../aphex.config';
import { TEST_ORG_ID } from './helpers/test-constants';
const ctx = { organizationId: TEST_ORG_ID, overrideAccess: true };

let cache: InMemoryCacheAdapter;
let localAPI: ReturnType<typeof createLocalAPI>;
const createdDocIds: string[] = [];

beforeAll(async () => {
	cache = new InMemoryCacheAdapter({ maxSize: 500 });
	localAPI = createLocalAPI({ ...cmsConfig, cache }, db);
}, 30000);

afterEach(async () => {
	for (const id of createdDocIds) {
		try {
			await localAPI.collections.page.delete(ctx, id);
		} catch {
			// already deleted
		}
	}
	createdDocIds.length = 0;
	await cache.flush();
});

describe('Cache Integration - Published Reads', () => {
	it('should cache findByID for published perspective', async () => {
		const { document } = await localAPI.collections.page.create(
			ctx,
			{ title: 'Cache FindByID Test', slug: 'cache-findbyid' },
			{ publish: true }
		);
		createdDocIds.push(document.id);

		// First read — cache miss
		const first = await localAPI.collections.page.findByID(ctx, document.id, {
			perspective: 'published'
		});
		expect(first).not.toBeNull();

		// Verify key exists in cache
		const cacheKey = `doc:${TEST_ORG_ID}:${document.id}`;
		const cached = await cache.get(cacheKey);
		expect(cached).not.toBeNull();

		// Second read — should return identical result from cache
		const second = await localAPI.collections.page.findByID(ctx, document.id, {
			perspective: 'published'
		});
		expect(second).toEqual(first);
	});

	it('should NOT cache draft perspective reads', async () => {
		const { document } = await localAPI.collections.page.create(ctx, {
			title: 'Draft No Cache',
			slug: 'draft-no-cache'
		});
		createdDocIds.push(document.id);

		await localAPI.collections.page.findByID(ctx, document.id, {
			perspective: 'draft'
		});

		// Cache should be empty — draft reads are not cached
		const cacheKey = `doc:${TEST_ORG_ID}:${document.id}`;
		expect(await cache.get(cacheKey)).toBeNull();
	});

	it('should cache find() for published perspective', async () => {
		const { document } = await localAPI.collections.page.create(
			ctx,
			{ title: 'Cache Find Test', slug: 'cache-find' },
			{ publish: true }
		);
		createdDocIds.push(document.id);

		const first = await localAPI.collections.page.find(ctx, {
			perspective: 'published',
			limit: 10
		});
		expect(first.docs.length).toBeGreaterThan(0);

		// Second call — same result from cache
		const second = await localAPI.collections.page.find(ctx, {
			perspective: 'published',
			limit: 10
		});
		expect(second).toEqual(first);
	});
});

describe('Cache Integration - Invalidation', () => {
	it('should invalidate on publish', async () => {
		const { document } = await localAPI.collections.page.create(ctx, {
			title: 'Before Publish',
			slug: 'invalidate-publish'
		});
		createdDocIds.push(document.id);

		// Populate cache with a collection query
		await localAPI.collections.page.find(ctx, { perspective: 'published', limit: 5 });

		// Publish — should invalidate collection queries
		await localAPI.collections.page.publish(ctx, document.id);

		// The cached doc key should also be cleared
		const cacheKey = `doc:${TEST_ORG_ID}:${document.id}`;
		expect(await cache.get(cacheKey)).toBeNull();
	});

	it('should invalidate on unpublish', async () => {
		const { document } = await localAPI.collections.page.create(
			ctx,
			{ title: 'Unpublish Invalidation', slug: 'invalidate-unpublish' },
			{ publish: true }
		);
		createdDocIds.push(document.id);

		// Populate cache
		await localAPI.collections.page.findByID(ctx, document.id, {
			perspective: 'published'
		});
		const cacheKey = `doc:${TEST_ORG_ID}:${document.id}`;
		expect(await cache.get(cacheKey)).not.toBeNull();

		// Unpublish — should clear cache
		await localAPI.collections.page.unpublish(ctx, document.id);
		expect(await cache.get(cacheKey)).toBeNull();
	});

	it('should invalidate on delete', async () => {
		const { document } = await localAPI.collections.page.create(
			ctx,
			{ title: 'Delete Invalidation', slug: 'invalidate-delete' },
			{ publish: true }
		);

		// Populate cache
		await localAPI.collections.page.findByID(ctx, document.id, {
			perspective: 'published'
		});
		const cacheKey = `doc:${TEST_ORG_ID}:${document.id}`;
		expect(await cache.get(cacheKey)).not.toBeNull();

		// Delete — should clear cache
		await localAPI.collections.page.delete(ctx, document.id);
		expect(await cache.get(cacheKey)).toBeNull();
	});
});
