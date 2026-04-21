/**
 * Unit tests for InMemoryCacheAdapter
 *
 * Run: pnpm -F @aphexcms/studio test cache-adapter
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryCacheAdapter, DocumentCache } from '@aphexcms/cms-core/server';

let cache: InMemoryCacheAdapter;

beforeEach(() => {
	cache = new InMemoryCacheAdapter({ maxSize: 100 });
});

describe('InMemoryCacheAdapter', () => {
	describe('get / set', () => {
		it('should return null for missing keys', async () => {
			expect(await cache.get('nonexistent')).toBeNull();
		});

		it('should store and retrieve values', async () => {
			await cache.set('key', { title: 'hello', count: 42 });
			expect(await cache.get('key')).toEqual({ title: 'hello', count: 42 });
		});

		it('should overwrite existing keys', async () => {
			await cache.set('key', 'first');
			await cache.set('key', 'second');
			expect(await cache.get('key')).toBe('second');
		});
	});

	describe('delete', () => {
		it('should remove a key', async () => {
			await cache.set('key', 'val');
			await cache.delete('key');
			expect(await cache.get('key')).toBeNull();
		});

		it('should not throw when deleting nonexistent key', async () => {
			await expect(cache.delete('ghost')).resolves.toBeUndefined();
		});
	});

	describe('TTL expiry', () => {
		it('should expire entries after TTL', async () => {
			await cache.set('key', 'val', 0.05); // 50ms
			expect(await cache.get('key')).toBe('val');
			await new Promise((r) => setTimeout(r, 60));
			expect(await cache.get('key')).toBeNull();
		});

		it('should use defaultTTL when no per-key TTL is set', async () => {
			const ttlCache = new InMemoryCacheAdapter({ defaultTTL: 0.05 });
			await ttlCache.set('key', 'val');
			expect(await ttlCache.get('key')).toBe('val');
			await new Promise((r) => setTimeout(r, 60));
			expect(await ttlCache.get('key')).toBeNull();
		});

		it('should not expire entries without TTL', async () => {
			await cache.set('key', 'val');
			await new Promise((r) => setTimeout(r, 50));
			expect(await cache.get('key')).toBe('val');
		});
	});

	describe('invalidateByPrefix', () => {
		it('should delete all keys matching the prefix', async () => {
			await cache.set('query:org1:page:a', 1);
			await cache.set('query:org1:page:b', 2);
			await cache.set('query:org1:movie:a', 3);
			await cache.set('doc:org1:123', 4);

			await cache.invalidateByPrefix('query:org1:page:');

			expect(await cache.get('query:org1:page:a')).toBeNull();
			expect(await cache.get('query:org1:page:b')).toBeNull();
			expect(await cache.get('query:org1:movie:a')).toBe(3);
			expect(await cache.get('doc:org1:123')).toBe(4);
		});

		it('should handle no matches gracefully', async () => {
			await cache.set('key', 'val');
			await cache.invalidateByPrefix('nope:');
			expect(await cache.get('key')).toBe('val');
		});
	});

	describe('flush', () => {
		it('should clear all entries', async () => {
			await cache.set('a', 1);
			await cache.set('b', 2);
			await cache.set('c', 3);
			await cache.flush();
			expect(await cache.get('a')).toBeNull();
			expect(await cache.get('b')).toBeNull();
			expect(await cache.get('c')).toBeNull();
		});
	});

	describe('maxSize eviction', () => {
		it('should evict oldest entry when at capacity', async () => {
			const smallCache = new InMemoryCacheAdapter({ maxSize: 3 });
			await smallCache.set('a', 1);
			await smallCache.set('b', 2);
			await smallCache.set('c', 3);
			// This should evict 'a'
			await smallCache.set('d', 4);

			expect(await smallCache.get('a')).toBeNull();
			expect(await smallCache.get('b')).toBe(2);
			expect(await smallCache.get('d')).toBe(4);
		});

		it('should not evict when updating existing key', async () => {
			const smallCache = new InMemoryCacheAdapter({ maxSize: 2 });
			await smallCache.set('a', 1);
			await smallCache.set('b', 2);
			// Updating 'a' should not evict anything
			await smallCache.set('a', 10);

			expect(await smallCache.get('a')).toBe(10);
			expect(await smallCache.get('b')).toBe(2);
		});
	});

	describe('isHealthy', () => {
		it('should return true', async () => {
			expect(await cache.isHealthy()).toBe(true);
		});
	});
});

describe('DocumentCache — query key differentiation', () => {
	let docCache: DocumentCache;

	beforeEach(() => {
		docCache = new DocumentCache(new InMemoryCacheAdapter({ maxSize: 100 }));
	});

	it('should produce different cache keys for different where clauses', async () => {
		const orgId = 'org-1';
		const collection = 'personality';

		await docCache.setQuery(
			orgId,
			collection,
			{
				where: { slug: { equals: 'alice' } },
				perspective: 'published',
				limit: 1
			},
			{ docs: [{ name: 'Alice' }] }
		);

		await docCache.setQuery(
			orgId,
			collection,
			{
				where: { slug: { equals: 'bob' } },
				perspective: 'published',
				limit: 1
			},
			{ docs: [{ name: 'Bob' }] }
		);

		const alice = await docCache.getQuery<any>(orgId, collection, {
			where: { slug: { equals: 'alice' } },
			perspective: 'published',
			limit: 1
		});

		const bob = await docCache.getQuery<any>(orgId, collection, {
			where: { slug: { equals: 'bob' } },
			perspective: 'published',
			limit: 1
		});

		expect(alice.docs[0].name).toBe('Alice');
		expect(bob.docs[0].name).toBe('Bob');
	});

	it('should produce same cache key regardless of key order', async () => {
		const orgId = 'org-1';
		const collection = 'page';

		await docCache.setQuery(
			orgId,
			collection,
			{
				where: { status: { equals: 'active' } },
				limit: 10,
				perspective: 'published'
			},
			{ docs: [{ title: 'Page 1' }] }
		);

		// Same options but different key order
		const result = await docCache.getQuery<any>(orgId, collection, {
			perspective: 'published',
			where: { status: { equals: 'active' } },
			limit: 10
		});

		expect(result).not.toBeNull();
		expect(result.docs[0].title).toBe('Page 1');
	});

	it('should differentiate deeply nested where clauses', async () => {
		const orgId = 'org-1';
		const collection = 'personality';

		await docCache.setQuery(
			orgId,
			collection,
			{
				where: { slug: { equals: 'alice' }, active: { equals: true } },
				perspective: 'published',
				limit: 1
			},
			{ docs: [{ name: 'Alice Active' }] }
		);

		await docCache.setQuery(
			orgId,
			collection,
			{
				where: { slug: { equals: 'alice' }, active: { equals: false } },
				perspective: 'published',
				limit: 1
			},
			{ docs: [{ name: 'Alice Inactive' }] }
		);

		const active = await docCache.getQuery<any>(orgId, collection, {
			where: { slug: { equals: 'alice' }, active: { equals: true } },
			perspective: 'published',
			limit: 1
		});

		const inactive = await docCache.getQuery<any>(orgId, collection, {
			where: { slug: { equals: 'alice' }, active: { equals: false } },
			perspective: 'published',
			limit: 1
		});

		expect(active.docs[0].name).toBe('Alice Active');
		expect(inactive.docs[0].name).toBe('Alice Inactive');
	});
});
