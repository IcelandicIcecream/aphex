/**
 * Singleton schema tests — covers the singleton-aware CollectionAPI surface
 * (get / find / create / update / delete) and verifies regular collections
 * are unaffected (regression).
 *
 * Run: pnpm test singleton
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createLocalAPI, SingletonOperationError } from '@aphexcms/cms-core/server';
import { db } from '$lib/server/db';
import cmsConfig from '../aphex.config';
import { TEST_ORG_ID } from './helpers/test-constants';

let localAPI: ReturnType<typeof createLocalAPI>;
const ctx = { organizationId: TEST_ORG_ID, overrideAccess: true };

beforeAll(async () => {
	localAPI = createLocalAPI(cmsConfig, db);
}, 30000);

// Note: we intentionally do NOT clean up the singleton row between tests.
// The whole point of a singleton is that `get()` is idempotent — the row
// persists across calls and across deploys. The deterministic id means
// other tests in this suite that touch siteNavigation operate on the same
// row, which mirrors real usage.

describe('Singleton schema — siteNavigation', () => {
	describe('get()', () => {
		it('lazy-creates the canonical row on first access', async () => {
			const doc = await localAPI.collections.siteNavigation.get(ctx);
			expect(doc).toBeDefined();
			expect((doc as any).id).toBeDefined();
		});

		it('returns the same id on every call (deterministic)', async () => {
			const a = await localAPI.collections.siteNavigation.get(ctx);
			const b = await localAPI.collections.siteNavigation.get(ctx);
			expect((a as any).id).toBe((b as any).id);
		});

		it('matches getSingletonId(ctx) on the collection', async () => {
			const doc = await localAPI.collections.siteNavigation.get(ctx);
			const id = localAPI.collections.siteNavigation.getSingletonId(ctx);
			expect(id).toBeDefined();
			expect((doc as any).id).toBe(id);
		});
	});

	describe('find()', () => {
		it('returns a one-element list ignoring filters/pagination', async () => {
			const result = await localAPI.collections.siteNavigation.find(ctx, {
				limit: 50,
				offset: 0
			});
			expect(result.docs).toHaveLength(1);
			expect(result.totalDocs).toBe(1);
			expect(result.totalPages).toBe(1);
			expect(result.hasNextPage).toBe(false);
		});

		it('returned doc id matches the singleton id', async () => {
			const result = await localAPI.collections.siteNavigation.find(ctx);
			expect((result.docs[0] as any).id).toBe(
				localAPI.collections.siteNavigation.getSingletonId(ctx)
			);
		});
	});

	describe('create()', () => {
		it('is idempotent — returns the existing canonical row', async () => {
			const first = await localAPI.collections.siteNavigation.get(ctx);
			const created = await localAPI.collections.siteNavigation.create(ctx, {
				brand: 'Should be ignored on existing row'
			} as any);
			expect((created.document as any).id).toBe((first as any).id);
		});

		it('ignores caller-supplied id option for singleton schemas', async () => {
			const created = await localAPI.collections.siteNavigation.create(ctx, {} as any, {
				id: 'caller-provided-id-should-not-stick'
			});
			expect((created.document as any).id).toBe(
				localAPI.collections.siteNavigation.getSingletonId(ctx)
			);
		});
	});

	describe('update()', () => {
		it('updates the canonical row when called with the singleton id', async () => {
			// Ensure the row exists before updating (lazy create)
			await localAPI.collections.siteNavigation.get(ctx);
			const id = localAPI.collections.siteNavigation.getSingletonId(ctx)!;
			const result = await localAPI.collections.siteNavigation.update(ctx, id, {
				brand: 'Updated brand'
			} as any);
			expect(result).not.toBeNull();
			expect((result?.document as any).brand).toBe('Updated brand');
		});
	});

	describe('delete()', () => {
		it('refuses to delete the canonical singleton row', async () => {
			await localAPI.collections.siteNavigation.get(ctx);
			const id = localAPI.collections.siteNavigation.getSingletonId(ctx)!;
			await expect(localAPI.collections.siteNavigation.delete(ctx, id)).rejects.toThrow(
				SingletonOperationError
			);
		});

		it('returns false for non-existent (random) ids without throwing', async () => {
			// Limbo rows (random uuids of singleton type left over from when the
			// schema was non-singleton) remain deletable. A random id that
			// doesn't exist just returns false — matches normal collection
			// behavior, no SingletonOperationError thrown.
			const ok = await localAPI.collections.siteNavigation.delete(
				ctx,
				'00000000-0000-4000-8000-000000000000'
			);
			expect(ok).toBe(false);
		});
	});

	describe('getSingletonId(ctx)', () => {
		it('returns a deterministic UUID-shaped string for singletons', () => {
			const id = localAPI.collections.siteNavigation.getSingletonId(ctx);
			expect(id).toBeDefined();
			expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/);
		});

		it('returns the same id for the same (org, schema)', () => {
			const a = localAPI.collections.siteNavigation.getSingletonId(ctx);
			const b = localAPI.collections.siteNavigation.getSingletonId(ctx);
			expect(a).toBe(b);
		});

		it('returns different ids across organizations (multi-tenant isolation)', () => {
			const a = localAPI.collections.siteNavigation.getSingletonId({
				organizationId: 'org-a',
				overrideAccess: true
			});
			const b = localAPI.collections.siteNavigation.getSingletonId({
				organizationId: 'org-b',
				overrideAccess: true
			});
			expect(a).not.toBe(b);
		});

		it('returns undefined for non-singleton collections', () => {
			expect(localAPI.collections.page.getSingletonId(ctx)).toBeUndefined();
		});
	});
});

describe('Regression — non-singleton collections unaffected', () => {
	const createdIds: string[] = [];

	it('page.get() throws SingletonOperationError', async () => {
		await expect(localAPI.collections.page.get(ctx)).rejects.toThrow(SingletonOperationError);
	});

	it('page.find() returns a real paginated list (filters honored)', async () => {
		const result = await localAPI.collections.page.find(ctx, { limit: 5, offset: 0 });
		expect(result.docs).toBeDefined();
		expect(typeof result.totalDocs).toBe('number');
		// totalDocs reflects actual page count, not 1
	});

	it('page.create() creates a fresh row with a new uuid each call', async () => {
		const a = await localAPI.collections.page.create(ctx, {
			title: 'Singleton regression A',
			slug: 'singleton-regression-a',
			published: false
		} as any);
		const b = await localAPI.collections.page.create(ctx, {
			title: 'Singleton regression B',
			slug: 'singleton-regression-b',
			published: false
		} as any);
		createdIds.push((a.document as any).id, (b.document as any).id);
		expect((a.document as any).id).not.toBe((b.document as any).id);
	});

	it('cleanup', async () => {
		for (const id of createdIds) {
			try {
				await localAPI.collections.page.delete(ctx, id);
			} catch {
				/* ignore */
			}
		}
	});
});
