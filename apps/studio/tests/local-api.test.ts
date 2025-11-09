/**
 * Local API tests - tests filtering, sorting, pagination, and type safety
 *
 * Run: pnpm test
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createLocalAPI } from '@aphexcms/cms-core/server';
import { db } from '$lib/server/db';
import cmsConfig from '../aphex.config';
import { seedDatabase } from './helpers/seed';

const TEST_ORG_ID = '99fbd8bc-dd8d-455c-9bd6-e2a99ad9c1c0';
let localAPI: ReturnType<typeof createLocalAPI>;

beforeAll(async () => {
	localAPI = createLocalAPI(cmsConfig, db);
	// Seed database before running tests
	await seedDatabase(localAPI);
}, 30000);

describe('Local API', () => {
	describe('Basic Operations', () => {
		it('should find documents', async () => {
			const result = await localAPI.collections.page.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{ limit: 10 }
			);

			expect(result.docs).toBeDefined();
			expect(result.totalDocs).toBeGreaterThanOrEqual(result.docs.length);
			expect(result.limit).toBe(10);
		});

		it('should find document by ID', async () => {
			const { docs } = await localAPI.collections.page.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{ limit: 1 }
			);

			if (docs[0]) {
				const found = await localAPI.collections.page.findByID(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					docs[0].id
				);

				expect(found).not.toBeNull();
				expect(found?.id).toBe(docs[0].id);
			}
		});

		it('should count documents', async () => {
			const total = await localAPI.collections.page.count({
				organizationId: TEST_ORG_ID,
				overrideAccess: true
			});

			expect(total).toBeGreaterThan(0);
		});
	});

	describe('JSONB Filtering', () => {
		it('should filter by equals', async () => {
			const result = await localAPI.collections.page.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					where: {
						title: { equals: 'Home' }
					}
				}
			);

			expect(result.docs.length).toBeGreaterThan(0);
			expect(result.docs[0]?.title).toBe('Home');
		});

		it('should filter by contains (case-insensitive)', async () => {
			const result = await localAPI.collections.page.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					where: {
						title: { contains: 'test' }
					}
				}
			);

			expect(result.docs.length).toBeGreaterThan(0);
			result.docs.forEach((doc) => {
				expect(doc.title.toLowerCase()).toContain('test');
			});
		});

		it('should filter nested fields (hero.heading)', async () => {
			const result = await localAPI.collections.page.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					where: {
						'hero.heading': { contains: 'Welcome' }
					}
				}
			);

			expect(result.docs.length).toBeGreaterThan(0);
			result.docs.forEach((doc) => {
				expect(doc.hero?.heading?.toLowerCase()).toContain('welcome');
			});
		});

		it('should combine filters with AND', async () => {
			const result = await localAPI.collections.page.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					where: {
						published: { equals: false },
						title: { contains: 'test' }
					}
				}
			);

			expect(result.docs.length).toBeGreaterThan(0);
		});

		it('should use OR filters', async () => {
			const result = await localAPI.collections.page.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					where: {
						or: [{ title: { equals: 'Home' } }, { title: { equals: 'About' } }]
					}
				}
			);

			expect(result.docs.length).toBe(2);
			const titles = result.docs.map((d) => d.title);
			expect(titles).toContain('Home');
			expect(titles).toContain('About');
		});
	});

	describe('Sorting', () => {
		it('should sort ascending', async () => {
			const result = await localAPI.collections.page.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					sort: 'title',
					limit: 10
				}
			);

			if (result.docs.length >= 2) {
				expect(result.docs[0].title <= result.docs[1].title).toBe(true);
			}
		});

		it('should sort descending', async () => {
			const result = await localAPI.collections.page.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					sort: '-title',
					limit: 10
				}
			);

			if (result.docs.length >= 2) {
				expect(result.docs[0].title >= result.docs[1].title).toBe(true);
			}
		});
	});

	describe('Pagination', () => {
		it('should paginate results', async () => {
			const page1 = await localAPI.collections.page.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{ limit: 2, offset: 0, sort: 'title' }
			);

			const page2 = await localAPI.collections.page.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{ limit: 2, offset: 2, sort: 'title' }
			);

			expect(page1.page).toBe(1);
			expect(page2.page).toBe(2);
			expect(page1.hasNextPage).toBe(true);
		});
	});

	describe('Type Safety & Data Transformation', () => {
		it('should return typed documents with direct field access', async () => {
			const result = await localAPI.collections.page.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{ limit: 1 }
			);

			const page = result.docs[0];
			if (page) {
				// No .draftData needed - fields are directly accessible!
				expect(typeof page.id).toBe('string');
				expect(typeof page.title).toBe('string');
				expect(typeof page.slug).toBe('string');
				expect(page._meta).toBeDefined();
				expect(page._meta?.type).toBe('page');
			}
		});

		it('should work with different collections', async () => {
			const result = await localAPI.collections.catalog.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{ limit: 1 }
			);

			const catalog = result.docs[0];
			if (catalog) {
				expect(catalog.title).toBeDefined();
				expect(Array.isArray(catalog.items)).toBe(true);
			}
		});
	});

	describe('Perspective (Draft vs Published)', () => {
		it('should query draft data', async () => {
			const result = await localAPI.collections.page.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{ limit: 1, perspective: 'draft' }
			);

			expect(result.docs.length).toBeGreaterThan(0);
		});

		it('should query published data', async () => {
			const result = await localAPI.collections.page.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					limit: 1,
					perspective: 'published',
					where: { published: { equals: true } }
				}
			);

			expect(result.docs.length).toBeGreaterThan(0);
		});
	});

	describe('Reference Resolution (Depth)', () => {
		it('should resolve references with depth', async () => {
			const result = await localAPI.collections.page.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{ limit: 1, depth: 2 }
			);

			const page = result.docs[0];
			if (page) {
				expect(page.id).toBeDefined();
				expect(page.title).toBeDefined();
				// References should be resolved at depth 2
			}
		});
	});

	describe('Validation', () => {
		it('should fail to publish when required fields are missing', async () => {
			// Create a page with missing required fields
			const page = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'Test Validation Page'
					// Missing required 'slug' field
				}
			);

			// Try to publish - should fail validation
			await expect(
				localAPI.collections.page.publish(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					page.id
				)
			).rejects.toThrow(/validation errors/i);
		});

		it('should fail to create and publish when required fields are missing', async () => {
			// Try to create and publish with missing required fields
			await expect(
				localAPI.collections.page.create(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					{
						title: 'Test Page'
						// Missing required 'slug' field
					},
					{ publish: true }
				)
			).rejects.toThrow(/validation errors/i);
		});

		it('should fail to update and publish when required fields are missing', async () => {
			// Create a valid page first
			const page = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'Valid Page',
					slug: 'valid-page'
				}
			);

			// Try to update with invalid data and publish
			await expect(
				localAPI.collections.page.update(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					page.id,
					{
						title: '' // Empty title should fail validation
					},
					{ publish: true }
				)
			).rejects.toThrow(/validation errors/i);
		});

		it('should successfully publish when all required fields are valid', async () => {
			// Create a page with all required fields
			const page = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'Valid Test Page',
					slug: 'valid-test-page',
					published: false
				}
			);

			// Publish - should succeed
			const published = await localAPI.collections.page.publish(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				page.id
			);

			expect(published).not.toBeNull();
			expect(published?._meta?.status).toBe('published');
		});

		it('should successfully create and publish with valid data', async () => {
			// Create and publish in one operation
			const page = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'Create and Publish Page',
					slug: 'create-and-publish-page',
					published: true
				},
				{ publish: true }
			);

			expect(page).not.toBeNull();
			expect(page._meta?.status).toBe('published');
		});

		it('should validate field constraints (max length)', async () => {
			// Title has max length of 100
			const longTitle = 'a'.repeat(101);

			// Try to create and publish with title too long
			await expect(
				localAPI.collections.page.create(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					{
						title: longTitle,
						slug: 'test-max-length'
					},
					{ publish: true }
				)
			).rejects.toThrow(/validation errors/i);
		});
	});
});
