/**
 * `public: true` strips tenant-identifying `_meta` from a read. These tests pin
 * that it does so on *every* path, because the projection is applied per call
 * site rather than centrally, and the bug it is guarding against is a call site
 * that forgets.
 *
 * The interesting axis is the cache. Cached payloads are stored deliberately
 * unfiltered — two callers with different roles share one entry and each gets
 * their own projection applied on the way out — so a cache-hit branch that
 * forgets `public` is not merely wrong, it is *intermittently* wrong: the same
 * query leaks while the entry is warm and stops when it expires. Each case here
 * therefore reads twice and asserts on both.
 *
 * Run: pnpm -F @aphexcms/studio test public-projection
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createLocalAPI, InMemoryCacheAdapter } from '@aphexcms/cms-core/server';
import { db } from '$lib/server/db';
import cmsConfig from './fixtures/config';
import { TEST_ORG_ID } from './helpers/test-constants';

const ctx = { organizationId: TEST_ORG_ID, overrideAccess: true };

/** The `_meta` keys `public: true` is contracted to remove. */
const STRIPPED = ['organizationId', 'createdBy', 'updatedBy', 'publishedHash'] as const;

let cache: InMemoryCacheAdapter;
let localAPI: ReturnType<typeof createLocalAPI>;
const createdDocIds: string[] = [];

beforeAll(() => {
	cache = new InMemoryCacheAdapter({ maxSize: 500 });
	localAPI = createLocalAPI({ ...cmsConfig, cache }, db);
}, 30000);

afterEach(async () => {
	for (const id of createdDocIds) {
		await localAPI.collections.page.delete(ctx, id).catch(() => {});
	}
	createdDocIds.length = 0;
	await cache.flush();
});

function expectStripped(doc: unknown) {
	expect(doc).toBeTruthy();
	const meta = (doc as { _meta?: Record<string, unknown> })._meta ?? {};
	for (const key of STRIPPED) {
		expect(meta, `_meta.${key} should not survive a public read`).not.toHaveProperty(key);
	}
	// The projection must remove exactly those keys, not flatten `_meta` wholesale —
	// public consumers still read status and timestamps off it.
	expect(meta).toHaveProperty('type');
	expect(meta).toHaveProperty('status');
}

function expectUnstripped(doc: unknown) {
	const meta = (doc as { _meta?: Record<string, unknown> })._meta ?? {};
	expect(meta).toHaveProperty('organizationId');
}

async function publishedPage(title: string, slug: string) {
	const { document } = await localAPI.collections.page.create(ctx, { title, slug } as never, {
		publish: true
	});
	createdDocIds.push(document.id);
	return document;
}

describe('public: true — findByID', () => {
	it('strips tenant meta on both the uncached and the cached read', async () => {
		const doc = await publishedPage('Public FindByID', 'public-findbyid');

		const uncached = await localAPI.collections.page.findByID(ctx, doc.id, {
			perspective: 'published',
			public: true
		});
		expectStripped(uncached);

		// The entry is warm now; the second read takes the cache-hit branch.
		const cached = await localAPI.collections.page.findByID(ctx, doc.id, {
			perspective: 'published',
			public: true
		});
		expectStripped(cached);
		expect(cached).toEqual(uncached);
	});

	it('leaves meta intact for a non-public read of the same warm entry', async () => {
		const doc = await publishedPage('Admin FindByID', 'admin-findbyid');

		await localAPI.collections.page.findByID(ctx, doc.id, {
			perspective: 'published',
			public: true
		});
		// Same cache entry, different caller intent — the stored payload must still
		// be the full one, or the public read has poisoned the admin read.
		const asAdmin = await localAPI.collections.page.findByID(ctx, doc.id, {
			perspective: 'published'
		});
		expectUnstripped(asAdmin);
	});
});

describe('public: true — find', () => {
	it('strips tenant meta on both the uncached and the cached query', async () => {
		await publishedPage('Public Find', 'public-find');

		const options = {
			perspective: 'published' as const,
			public: true,
			where: { slug: { equals: 'public-find' } }
		};

		const uncached = await localAPI.collections.page.find(ctx, options);
		expect(uncached.docs.length).toBeGreaterThan(0);
		uncached.docs.forEach(expectStripped);

		const cached = await localAPI.collections.page.find(ctx, options);
		expect(cached.docs.length).toBe(uncached.docs.length);
		cached.docs.forEach(expectStripped);
	});

	it('leaves meta intact for a non-public query of the same warm entry', async () => {
		await publishedPage('Admin Find', 'admin-find');

		const where = { slug: { equals: 'admin-find' } };
		await localAPI.collections.page.find(ctx, {
			perspective: 'published',
			public: true,
			where
		});
		const asAdmin = await localAPI.collections.page.find(ctx, {
			perspective: 'published',
			where
		});
		expect(asAdmin.docs.length).toBeGreaterThan(0);
		asAdmin.docs.forEach(expectUnstripped);
	});
});

describe('public: true — singletons', () => {
	// `find()` short-circuits for singleton schemas and returns before reaching the
	// projection applied to a normal query, so it needs its own coverage: the option
	// has to be forwarded into `get()` rather than dropped alongside the filters.
	it('strips tenant meta from find() on a singleton collection', async () => {
		const result = await localAPI.collections.siteSettings.find(ctx, {
			perspective: 'draft',
			public: true
		});
		expect(result.docs.length).toBe(1);
		result.docs.forEach(expectStripped);
	});

	it('strips tenant meta from get() on a singleton collection', async () => {
		const doc = await localAPI.collections.siteSettings.get(ctx, {
			perspective: 'draft',
			public: true
		});
		expectStripped(doc);
	});
});
