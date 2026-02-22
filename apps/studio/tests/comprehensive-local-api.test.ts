/**
 * Comprehensive Local API tests
 * Tests all CRUD operations, filtering, sorting, pagination for all collections
 *
 * Run: pnpm test comprehensive-local-api
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createLocalAPI } from '@aphexcms/cms-core/server';
import { db } from '$lib/server/db';
import cmsConfig from '../aphex.config';
import type { CatalogItem } from '$lib/generated-types';

const TEST_ORG_ID = '8a5c55fe-f89e-4e73-93b3-aba660e8e26b';
let localAPI: ReturnType<typeof createLocalAPI>;

// Track created document IDs for cleanup
const createdDocIds = {
	pages: [] as string[],
	catalogs: [] as string[],
	movies: [] as string[]
};

beforeAll(async () => {
	localAPI = createLocalAPI(cmsConfig, db);
}, 30000);

afterEach(async () => {
	// Clean up created documents after each test
	for (const id of createdDocIds.pages) {
		try {
			await localAPI.collections.page.delete(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				id
			);
		} catch (e) {
			// Ignore errors if already deleted
		}
	}
	for (const id of createdDocIds.catalogs) {
		try {
			await localAPI.collections.catalog.delete(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				id
			);
		} catch (e) {
			// Ignore errors if already deleted
		}
	}
	for (const id of createdDocIds.movies) {
		try {
			await localAPI.collections.movie.delete(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				id
			);
		} catch (e) {
			// Ignore errors if already deleted
		}
	}
	// Clear tracking arrays
	createdDocIds.pages = [];
	createdDocIds.catalogs = [];
	createdDocIds.movies = [];
});

describe('LocalAPI - Page Collection', () => {
	describe('CREATE Operations', () => {
		it('should create a page with all required fields', async () => {
			const result = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'Test Create Page',
					slug: 'test-create-page',
					published: false
				}
			);
			const page = result.document;

			createdDocIds.pages.push(page.id);

			expect(page.id).toBeDefined();
			expect(page.title).toBe('Test Create Page');
			expect(page.slug).toBe('test-create-page');
			expect(page.published).toBe(false);
			expect(page._meta).toBeDefined();
			expect(page._meta?.type).toBe('page');
			expect(page._meta?.status).toBe('draft');
		});

		it('should create a page with nested hero object', async () => {
			const result = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'Page with Hero',
					slug: 'page-with-hero',
					hero: {
						heading: 'Welcome',
						subheading: 'This is a test',
						ctaText: 'Click Me',
						ctaUrl: '/action'
					},
					published: false
				}
			);
			const page = result.document;

			createdDocIds.pages.push(page.id);

			expect(page.hero).toBeDefined();
			expect(page.hero?.heading).toBe('Welcome');
			expect(page.hero?.subheading).toBe('This is a test');
			expect(page.hero?.ctaText).toBe('Click Me');
			expect(page.hero?.ctaUrl).toBe('/action');
		});

		it('should create and publish a page in one operation', async () => {
			const result = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'Create and Publish Page',
					slug: 'create-publish-page',
					published: true
				},
				{ publish: true }
			);
			const page = result.document;

			createdDocIds.pages.push(page.id);

			expect(page._meta?.status).toBe('published');
			expect(page._meta?.publishedAt).not.toBeNull();
		});

		it('should fail to publish page without required title', async () => {
			// Create without title is OK as draft, but publishing should fail
			const result = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					slug: 'no-title-page'
				} as any
			);
			createdDocIds.pages.push(result.document.id);

			// Publishing should fail validation
			await expect(
				localAPI.collections.page.publish(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					result.document.id
				)
			).rejects.toThrow(/validation errors/i);
		});

		it('should fail to publish page without required slug', async () => {
			// Create without slug is OK as draft, but publishing should fail
			const result = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'No Slug Page'
				} as any
			);
			createdDocIds.pages.push(result.document.id);

			// Publishing should fail validation
			await expect(
				localAPI.collections.page.publish(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					result.document.id
				)
			).rejects.toThrow(/validation errors/i);
		});
	});

	describe('READ Operations', () => {
		it('should find a page by ID', async () => {
			// Create a page first
			const created = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'Find by ID Test',
					slug: 'find-by-id-test',
					published: false
				}
			);
			createdDocIds.pages.push(created.document.id);

			// Find it
			const found = await localAPI.collections.page.findByID(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				created.document.id
			);

			expect(found).not.toBeNull();
			expect(found?.id).toBe(created.document.id);
			expect(found?.title).toBe('Find by ID Test');
		});

		it('should return null for non-existent ID', async () => {
			const found = await localAPI.collections.page.findByID(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				'00000000-0000-0000-0000-000000000000' // Valid UUID format but non-existent
			);

			expect(found).toBeNull();
		});

		it('should find pages with filtering', async () => {
			// Create test pages
			await localAPI.collections.page
				.create(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					{
						title: 'Filterable Page 1',
						slug: 'filterable-1',
						published: true
					}
				)
				.then((p) => createdDocIds.pages.push(p.document.id));

			await localAPI.collections.page
				.create(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					{
						title: 'Filterable Page 2',
						slug: 'filterable-2',
						published: false
					}
				)
				.then((p) => createdDocIds.pages.push(p.document.id));

			// Find only published
			const result = await localAPI.collections.page.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					where: {
						title: { contains: 'Filterable' },
						published: { equals: true }
					}
				}
			);

			expect(result.docs.length).toBeGreaterThanOrEqual(1);
			result.docs.forEach((doc) => {
				if (doc.title.includes('Filterable')) {
					expect(doc.published).toBe(true);
				}
			});
		});

		it('should find pages with pagination', async () => {
			const result = await localAPI.collections.page.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					limit: 2,
					offset: 0
				}
			);

			expect(result.limit).toBe(2);
			expect(result.offset).toBe(0);
			expect(result.totalDocs).toBeGreaterThanOrEqual(0);
			expect(result.page).toBe(1);
		});

		it('should count pages', async () => {
			await localAPI.collections.page
				.create(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					{
						title: 'Countable Page',
						slug: 'countable-page',
						published: false
					}
				)
				.then((p) => createdDocIds.pages.push(p.document.id));

			const count = await localAPI.collections.page.count(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					where: { title: { contains: 'Countable' } }
				}
			);

			expect(count).toBeGreaterThanOrEqual(1);
		});
	});

	describe('UPDATE Operations', () => {
		it('should update a page', async () => {
			// Create a page
			const created = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'Original Title',
					slug: 'original-slug',
					published: false
				}
			);
			createdDocIds.pages.push(created.document.id);

			// Update it - include all required fields for a complete update
			const updated = await localAPI.collections.page.update(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				created.document.id,
				{
					title: 'Updated Title',
					slug: 'original-slug', // Keep slug the same
					published: false
				}
			);

			expect(updated).not.toBeNull();
			expect(updated?.document.title).toBe('Updated Title');
			expect(updated?.document.id).toBe(created.document.id);
		});

		it('should update and publish in one operation', async () => {
			// Create a draft page with all required fields
			const created = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'Draft Page',
					slug: 'draft-page',
					published: false
				}
			);
			createdDocIds.pages.push(created.document.id);

			// Update with all required fields and publish
			const updated = await localAPI.collections.page.update(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				created.document.id,
				{
					title: 'Updated and Published Page',
					slug: 'draft-page', // Must include slug for validation
					published: true
				},
				{ publish: true }
			);

			expect(updated?.document._meta?.status).toBe('published');
			expect(updated?.document.title).toBe('Updated and Published Page');
		});
	});

	describe('DELETE Operations', () => {
		it('should delete a page', async () => {
			// Create a page
			const created = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'To Be Deleted',
					slug: 'to-be-deleted',
					published: false
				}
			);

			// Delete it
			const deleted = await localAPI.collections.page.delete(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				created.document.id
			);

			expect(deleted).toBe(true);

			// Verify it's gone
			const found = await localAPI.collections.page.findByID(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				created.document.id
			);
			expect(found).toBeNull();
		});
	});

	describe('PUBLISH/UNPUBLISH Operations', () => {
		it('should publish a page', async () => {
			// Create a draft page
			const created = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'To Be Published',
					slug: 'to-be-published',
					published: false
				}
			);
			createdDocIds.pages.push(created.document.id);

			// Publish it
			const published = await localAPI.collections.page.publish(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				created.document.id
			);

			expect(published).not.toBeNull();
			expect(published?._meta?.status).toBe('published');
			expect(published?._meta?.publishedAt).not.toBeNull();
		});

		it('should unpublish a page', async () => {
			// Create and publish a page
			const created = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'To Be Unpublished',
					slug: 'to-be-unpublished',
					published: true
				},
				{ publish: true }
			);
			createdDocIds.pages.push(created.document.id);

			// Unpublish it
			const unpublished = await localAPI.collections.page.unpublish(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				created.document.id
			);

			expect(unpublished).not.toBeNull();
			expect(unpublished?._meta?.status).toBe('draft');
		});
	});
});

describe('LocalAPI - Catalog Collection', () => {
	describe('CREATE Operations', () => {
		it('should create a catalog with array of items', async () => {
			const { document: catalog } = await localAPI.collections.catalog.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'Test Catalog',
					description: 'A test catalog',
					items: [
						{
							title: 'Item 1',
							shortDescription: 'First item',
							price: 10.99
						} as CatalogItem,
						{
							title: 'Item 2',
							shortDescription: 'Second item',
							price: 20.99
						} as CatalogItem
					],
					published: false
				}
			);

			createdDocIds.catalogs.push(catalog.id);

			expect(catalog.id).toBeDefined();
			expect(catalog.title).toBe('Test Catalog');
			expect(catalog.items).toBeDefined();
			expect(catalog.items).toHaveLength(2);
			expect(catalog.items?.[0]?.title).toBe('Item 1');
			expect(catalog.items?.[0]?.price).toBe(10.99);
		});

		it('should create catalog without items', async () => {
			const { document: catalog } = await localAPI.collections.catalog.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'Empty Catalog',
					description: 'A catalog with no items yet',
					published: false
				}
			);

			createdDocIds.catalogs.push(catalog.id);

			expect(catalog.items).toBeUndefined();
		});

		it('should fail to publish catalog without required description', async () => {
			// Create without description is OK as draft, but publishing should fail
			const { document: catalog } = await localAPI.collections.catalog.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'No Description Catalog'
				} as any
			);
			createdDocIds.catalogs.push(catalog.id);

			// Publishing should fail validation
			await expect(
				localAPI.collections.catalog.publish(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					catalog.id
				)
			).rejects.toThrow(/validation errors/i);
		});
	});

	describe('READ Operations', () => {
		it('should find catalogs and access nested items', async () => {
			// Create a catalog
			const { document: created } = await localAPI.collections.catalog.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'Findable Catalog',
					description: 'For testing find',
					items: [
						{
							_type: 'catalogItem',
							title: 'Product A',
							shortDescription: 'Description A',
							price: 99.99
						}
					],
					published: true
				}
			);
			createdDocIds.catalogs.push(created.id);

			// Find it
			const result = await localAPI.collections.catalog.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					where: {
						title: { equals: 'Findable Catalog' }
					}
				}
			);

			expect(result.docs.length).toBeGreaterThanOrEqual(1);
			const found = result.docs[0];
			expect(found?.items).toBeDefined();
			expect(Array.isArray(found?.items)).toBe(true);
		});
	});

	describe('UPDATE Operations', () => {
		it('should update catalog items array', async () => {
			// Create catalog
			const { document: created } = await localAPI.collections.catalog.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'Updateable Catalog',
					description: 'For testing updates',
					items: [
						{
							_type: 'catalogItem',
							title: 'Original Item',
							shortDescription: 'Original',
							price: 50
						}
					],
					published: false
				}
			);
			createdDocIds.catalogs.push(created.id);

			// Update items
			const updated = await localAPI.collections.catalog.update(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				created.id,
				{
					items: [
						{
							_type: 'catalogItem',
							title: 'Updated Item',
							shortDescription: 'Updated',
							price: 75
						},
						{
							_type: 'catalogItem',
							title: 'New Item',
							shortDescription: 'New',
							price: 100
						}
					]
				}
			);

			expect(updated?.document.items).toHaveLength(2);
			expect(updated?.document.items?.[0]?.title).toBe('Updated Item');
		});
	});
});

describe('LocalAPI - Movie Collection', () => {
	describe('CREATE Operations', () => {
		it('should create a movie with required fields', async () => {
			const { document: movie } = await localAPI.collections.movie.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'Test Movie',
					releaseDate: '2024-01-15',
					director: 'Test Director',
					synopsis: 'A test movie synopsis'
				}
			);

			createdDocIds.movies.push(movie.id);

			expect(movie.id).toBeDefined();
			expect(movie.title).toBe('Test Movie');
			expect(movie.releaseDate).toBe('2024-01-15');
			expect(movie.director).toBe('Test Director');
		});

		it('should create a movie with only required fields', async () => {
			const { document: movie } = await localAPI.collections.movie.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'Minimal Movie',
					releaseDate: '2024-03-01'
				}
			);

			createdDocIds.movies.push(movie.id);

			expect(movie.director).toBeUndefined();
			expect(movie.synopsis).toBeUndefined();
		});
	});

	describe('READ Operations', () => {
		it('should find movies by director', async () => {
			await localAPI.collections.movie
				.create(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					{
						title: 'Director Test 1',
						releaseDate: '2024-01-01',
						director: 'Specific Director'
					}
				)
				.then((m) => createdDocIds.movies.push(m.document.id));

			await localAPI.collections.movie
				.create(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					{
						title: 'Director Test 2',
						releaseDate: '2024-02-01',
						director: 'Specific Director'
					}
				)
				.then((m) => createdDocIds.movies.push(m.document.id));

			const result = await localAPI.collections.movie.find(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					where: {
						director: { equals: 'Specific Director' }
					}
				}
			);

			expect(result.docs.length).toBeGreaterThanOrEqual(2);
			result.docs.forEach((movie) => {
				if (movie.title.startsWith('Director Test')) {
					expect(movie.director).toBe('Specific Director');
				}
			});
		});
	});
});

describe('LocalAPI - Cross-Collection Operations', () => {
	it('should create documents in multiple collections', async () => {
		const { document: page } = await localAPI.collections.page.create(
			{ organizationId: TEST_ORG_ID, overrideAccess: true },
			{
				title: 'Cross-Collection Test Page',
				slug: 'cross-collection-page',
				published: false
			}
		);
		createdDocIds.pages.push(page.id);

		const { document: catalog } = await localAPI.collections.catalog.create(
			{ organizationId: TEST_ORG_ID, overrideAccess: true },
			{
				title: 'Cross-Collection Test Catalog',
				description: 'Testing cross-collection',
				published: false
			}
		);
		createdDocIds.catalogs.push(catalog.id);

		const { document: movie } = await localAPI.collections.movie.create(
			{ organizationId: TEST_ORG_ID, overrideAccess: true },
			{
				title: 'Cross-Collection Test Movie',
				releaseDate: '2024-01-01'
			}
		);
		createdDocIds.movies.push(movie.id);

		expect(page._meta?.type).toBe('page');
		expect(catalog._meta?.type).toBe('catalog');
		expect(movie._meta?.type).toBe('movie');
	});
});
