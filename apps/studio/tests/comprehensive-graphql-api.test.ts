/**
 * Comprehensive GraphQL API tests
 * Tests all GraphQL queries and mutations with filtering
 *
 * Run: pnpm test comprehensive-graphql-api
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createLocalAPI } from '@aphexcms/cms-core/server';
import { db } from '$lib/server/db';
import cmsConfig from '../aphex.config';
import { createYoga, createSchema } from 'graphql-yoga';
import { generateGraphQLSchema } from '@aphexcms/cms-core/graphql/schema';
import { createResolvers } from '@aphexcms/cms-core/graphql/resolvers';
import type { CMSInstances } from '@aphexcms/cms-core/server';

const TEST_ORG_ID = 'e57d5255-85e0-4ade-a294-17d60815b130';

let localAPI: ReturnType<typeof createLocalAPI>;
let cmsInstances: CMSInstances;
let yoga: any;

// Track created document IDs for cleanup
const createdDocIds = {
	pages: [] as string[],
	catalogs: [] as string[],
	movies: [] as string[]
};

// Mock auth
const mockAuth = {
	type: 'session' as const,
	organizationId: TEST_ORG_ID,
	user: {
		id: 'test-user-id',
		email: 'test@example.com',
		name: 'Test User',
		role: 'admin' as const
	}
};

beforeAll(async () => {
	localAPI = createLocalAPI(cmsConfig, db);
	cmsInstances = {
		config: cmsConfig,
		databaseAdapter: db,
		localAPI
	};

	// Clean up any existing test data first
	const existingPages = await localAPI.collections.page.find(
		{ organizationId: TEST_ORG_ID, overrideAccess: true },
		{ limit: 1000 }
	);
	for (const page of existingPages.docs) {
		try {
			await localAPI.collections.page.delete(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				page.id
			);
		} catch (e) {
			// Ignore errors
		}
	}

	// Set up GraphQL server
	const typeDefs = generateGraphQLSchema(cmsConfig.schemaTypes);
	const resolvers = createResolvers(cmsInstances, cmsConfig.schemaTypes, 'published');

	yoga = createYoga({
		schema: createSchema({
			typeDefs,
			resolvers
		}),
		context: async () => ({
			organizationId: TEST_ORG_ID,
			auth: mockAuth,
			localAPI
		}),
		logging: {
			debug: console.debug,
			info: console.info,
			warn: console.warn,
			error: console.error
		}
	});
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

// Helper function to execute GraphQL queries
async function executeGraphQL(query: string, variables: any = {}) {
	const response = await yoga.fetch('http://localhost/graphql', {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			query,
			variables
		})
	});

	return response.json();
}

describe('GraphQL API - Page Queries', () => {
	describe('page(id) Query', () => {
		it('should get a page by ID', async () => {
			// Create and publish a page
			const created = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'GraphQL Get Test',
					slug: 'graphql-get-test'
				},
				{ publish: true }
			);
			const createdId = created.document.id;
			createdDocIds.pages.push(createdId);

			// Query it via GraphQL
			const result = await executeGraphQL(
				`
				query GetPage($id: ID!) {
					page(id: $id) {
						id
						title
						slug
						published
						status
					}
				}
			`,
				{ id: createdId }
			);

			expect(result.errors).toBeUndefined();
			expect(result.data.page).not.toBeNull();
			expect(result.data.page.id).toBe(createdId);
			expect(result.data.page.title).toBe('GraphQL Get Test');
		});

		it('should return null for non-existent ID', async () => {
			const result = await executeGraphQL(`
				query {
					page(id: "00000000-0000-0000-0000-000000000000") {
						id
						title
					}
				}
			`);

			expect(result.data.page).toBeNull();
		});
	});

	describe('allPage Query', () => {
		it('should list all pages', async () => {
			// Create and publish test pages
			for (let i = 1; i <= 3; i++) {
				const page = await localAPI.collections.page.create(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					{
						title: `GraphQL List Test ${i}`,
						slug: `graphql-list-test-${i}`
					},
					{ publish: true }
				);
				createdDocIds.pages.push(page.document.id);
			}

			const result = await executeGraphQL(`
				query {
					allPage(where: { title: { starts_with: "GraphQL List Test" } }) {
						id
						title
						slug
						published
					}
				}
			`);

			expect(result.errors).toBeUndefined();
			expect(Array.isArray(result.data.allPage)).toBe(true);
			expect(result.data.allPage.length).toBe(3);
		});

		it('should filter pages with where clause', async () => {
			// Create test pages
			await localAPI.collections.page
				.create(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					{
						title: 'GraphQL Filter Published',
						slug: 'graphql-filter-published',
						published: true
					},
					{ publish: true }
				)
				.then((p) => createdDocIds.pages.push(p.document.id));

			await localAPI.collections.page
				.create(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					{
						title: 'GraphQL Filter Draft',
						slug: 'graphql-filter-draft',
						published: false
					}
				)
				.then((p) => createdDocIds.pages.push(p.document.id));

			const result = await executeGraphQL(`
				query {
					allPage(where: { title: { contains: "GraphQL Filter" }, published: { equals: true } }) {
						id
						title
						published
					}
				}
			`);

			expect(result.errors).toBeUndefined();
			expect(result.data.allPage.length).toBeGreaterThanOrEqual(1);
			result.data.allPage.forEach((page: any) => {
				if (page.title.includes('GraphQL Filter')) {
					expect(page.published).toBe(true);
				}
			});
		});

		it('should support pagination with limit and offset', async () => {
			// Create test pages for pagination
			for (let i = 1; i <= 5; i++) {
				const page = await localAPI.collections.page.create(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					{
						title: `GraphQL Pagination Test ${i}`,
						slug: `graphql-pagination-test-${i}`
					},
					{ publish: true }
				);
				createdDocIds.pages.push(page.document.id);
			}

			const result = await executeGraphQL(`
				query {
					allPage(
						where: { title: { starts_with: "GraphQL Pagination Test" } }
						limit: 2
						offset: 0
					) {
						id
						title
					}
				}
			`);

			expect(result.errors).toBeUndefined();
			expect(result.data.allPage.length).toBe(2);
		});

		it('should support sorting', async () => {
			// Create test pages for sorting
			const titles = ['GraphQL Sort C', 'GraphQL Sort A', 'GraphQL Sort B'];
			for (const title of titles) {
				const page = await localAPI.collections.page.create(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					{
						title,
						slug: title.toLowerCase().replace(/\s/g, '-')
					},
					{ publish: true }
				);
				createdDocIds.pages.push(page.document.id);
			}

			const result = await executeGraphQL(`
				query {
					allPage(
						where: { title: { starts_with: "GraphQL Sort" } }
						sort: "-title"
					) {
						id
						title
					}
				}
			`);

			expect(result.errors).toBeUndefined();
			expect(result.data.allPage.length).toBe(3);
			expect(result.data.allPage[0].title).toBe('GraphQL Sort C');
			expect(result.data.allPage[1].title).toBe('GraphQL Sort B');
			expect(result.data.allPage[2].title).toBe('GraphQL Sort A');
		});

		it('should support OR filters', async () => {
			// Create and publish test pages
			await localAPI.collections.page
				.create(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					{
						title: 'GraphQL OR Test A',
						slug: 'graphql-or-test-a'
					},
					{ publish: true }
				)
				.then((p) => createdDocIds.pages.push(p.document.id));

			await localAPI.collections.page
				.create(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					{
						title: 'GraphQL OR Test B',
						slug: 'graphql-or-test-b'
					},
					{ publish: true }
				)
				.then((p) => createdDocIds.pages.push(p.document.id));

			const result = await executeGraphQL(`
				query {
					allPage(where: {
						OR: [
							{ title: { equals: "GraphQL OR Test A" } },
							{ title: { equals: "GraphQL OR Test B" } }
						]
					}) {
						id
						title
					}
				}
			`);

			expect(result.errors).toBeUndefined();
			expect(result.data.allPage.length).toBeGreaterThanOrEqual(2);
		});

		it('should query nested hero fields', async () => {
			const page = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'GraphQL Hero Test',
					slug: 'graphql-hero-test',
					hero: {
						heading: 'Hero Heading',
						subheading: 'Hero Subheading',
						ctaText: 'Click',
						ctaUrl: '/action'
					}
				},
				{ publish: true }
			);
			const pageId = page.document.id;
			createdDocIds.pages.push(pageId);

			const result = await executeGraphQL(
				`
				query GetPageWithHero($id: ID!) {
					page(id: $id) {
						id
						title
						hero {
							heading
							subheading
							ctaText
							ctaUrl
						}
					}
				}
			`,
				{ id: pageId }
			);

			expect(result.errors).toBeUndefined();
			expect(result.data.page.hero).not.toBeNull();
			expect(result.data.page.hero.heading).toBe('Hero Heading');
		});
	});
});

describe('GraphQL API - Page Mutations', () => {
	describe('createPage Mutation', () => {
		it('should create a page', async () => {
			const result = await executeGraphQL(`
				mutation {
					createPage(data: {
						title: "GraphQL Created Page"
						slug: "graphql-created-page"
						published: false
					}) {
						id
						title
						slug
						status
					}
				}
			`);

			expect(result.errors).toBeUndefined();
			expect(result.data.createPage).not.toBeNull();
			expect(result.data.createPage.title).toBe('GraphQL Created Page');
			expect(result.data.createPage.status).toBe('draft');

			createdDocIds.pages.push(result.data.createPage.id);
		});

		it('should create and publish a page', async () => {
			const result = await executeGraphQL(`
				mutation {
					createPage(data: {
						title: "GraphQL Create and Publish"
						slug: "graphql-create-publish"
						published: true
					}, publish: true) {
						id
						title
						status
						publishedAt
					}
				}
			`);

			expect(result.errors).toBeUndefined();
			expect(result.data.createPage.status).toBe('published');
			expect(result.data.createPage.publishedAt).not.toBeNull();

			createdDocIds.pages.push(result.data.createPage.id);
		});

		it('should fail to create page without required fields', async () => {
			const result = await executeGraphQL(`
				mutation {
					createPage(data: {
						title: "Missing Slug"
					}) {
						id
						title
					}
				}
			`);

			expect(result.errors).toBeDefined();
		});
	});

	describe('updatePage Mutation', () => {
		it('should update a page', async () => {
			// Create a page
			const created = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'GraphQL Update Test',
					slug: 'graphql-update-test',
					published: false
				}
			);
			const createdId = created.document.id;
			createdDocIds.pages.push(createdId);

			// Update it
			const result = await executeGraphQL(
				`
				mutation UpdatePage($id: ID!) {
					updatePage(id: $id, data: {
						title: "GraphQL Updated Title"
					}) {
						id
						title
					}
				}
			`,
				{ id: createdId }
			);

			expect(result.errors).toBeUndefined();
			expect(result.data.updatePage.title).toBe('GraphQL Updated Title');
		});
	});

	describe('deletePage Mutation', () => {
		it('should delete a page', async () => {
			// Create a page
			const created = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'GraphQL Delete Test',
					slug: 'graphql-delete-test',
					published: false
				}
			);
			const createdId = created.document.id;

			// Delete it
			const result = await executeGraphQL(
				`
				mutation DeletePage($id: ID!) {
					deletePage(id: $id) {
						success
					}
				}
			`,
				{ id: createdId }
			);

			expect(result.errors).toBeUndefined();
			expect(result.data.deletePage.success).toBe(true);

			// Verify it's gone
			const found = await localAPI.collections.page.findByID(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				createdId
			);
			expect(found).toBeNull();
		});
	});

	describe('publishPage Mutation', () => {
		it('should publish a page', async () => {
			// Create a draft page
			const created = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'GraphQL Publish Test',
					slug: 'graphql-publish-test',
					published: false
				}
			);
			const createdId = created.document.id;
			createdDocIds.pages.push(createdId);

			// Publish it
			const result = await executeGraphQL(
				`
				mutation PublishPage($id: ID!) {
					publishPage(id: $id) {
						id
						status
						publishedAt
					}
				}
			`,
				{ id: createdId }
			);

			expect(result.errors).toBeUndefined();
			expect(result.data.publishPage.status).toBe('published');
			expect(result.data.publishPage.publishedAt).not.toBeNull();
		});
	});

	describe('unpublishPage Mutation', () => {
		it('should unpublish a page', async () => {
			// Create and publish a page
			const created = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'GraphQL Unpublish Test',
					slug: 'graphql-unpublish-test',
					published: true
				},
				{ publish: true }
			);
			const createdId = created.document.id;
			createdDocIds.pages.push(createdId);

			// Unpublish it
			const result = await executeGraphQL(
				`
				mutation UnpublishPage($id: ID!) {
					unpublishPage(id: $id) {
						id
						status
						publishedAt
					}
				}
			`,
				{ id: createdId }
			);

			expect(result.errors).toBeUndefined();
			expect(result.data.unpublishPage.status).toBe('draft');
		});
	});
});

describe('GraphQL API - Catalog Queries and Mutations', () => {
	describe('catalog(id) Query', () => {
		it('should get a catalog with items', async () => {
			// Create and publish a catalog
			const created = await localAPI.collections.catalog.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'GraphQL Catalog Test',
					description: 'A test catalog',
					items: [
						{
							_type: 'catalogItem',
							title: 'Item 1',
							shortDescription: 'First item',
							price: 10.99
						},
						{
							_type: 'catalogItem',
							title: 'Item 2',
							shortDescription: 'Second item',
							price: 20.99
						}
					]
				},
				{ publish: true }
			);
			const createdId = created.document.id;
			createdDocIds.catalogs.push(createdId);

			// Query it
			const result = await executeGraphQL(
				`
				query GetCatalog($id: ID!) {
					catalog(id: $id) {
						id
						title
						description
						items {
							title
							shortDescription
							price
						}
					}
				}
			`,
				{ id: createdId }
			);

			expect(result.errors).toBeUndefined();
			expect(result.data.catalog).not.toBeNull();
			expect(result.data.catalog.items).toHaveLength(2);
			expect(result.data.catalog.items[0].title).toBe('Item 1');
		});
	});

	describe('createCatalog Mutation', () => {
		it('should create a catalog with items', async () => {
			const result = await executeGraphQL(`
				mutation {
					createCatalog(data: {
						title: "GraphQL Created Catalog"
						description: "Created via GraphQL"
						items: [
							{
								_type: "catalogItem"
								title: "New Item"
								shortDescription: "New item description"
								price: 15.99
							}
						]
						published: false
					}) {
						id
						title
						items {
							title
							price
						}
					}
				}
			`);

			expect(result.errors).toBeUndefined();
			expect(result.data.createCatalog).not.toBeNull();
			expect(result.data.createCatalog.items).toHaveLength(1);

			createdDocIds.catalogs.push(result.data.createCatalog.id);
		});
	});
});

describe('GraphQL API - Movie Queries and Mutations', () => {
	describe('movie(id) Query', () => {
		it('should get a movie by ID', async () => {
			// Create and publish a movie
			const created = await localAPI.collections.movie.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'GraphQL Movie Test',
					releaseDate: '2024-01-01',
					director: 'Test Director',
					synopsis: 'A test movie'
				},
				{ publish: true }
			);
			const createdId = created.document.id;
			createdDocIds.movies.push(createdId);

			// Query it
			const result = await executeGraphQL(
				`
				query GetMovie($id: ID!) {
					movie(id: $id) {
						id
						title
						releaseDate
						director
						synopsis
					}
				}
			`,
				{ id: createdId }
			);

			expect(result.errors).toBeUndefined();
			expect(result.data.movie).not.toBeNull();
			expect(result.data.movie.title).toBe('GraphQL Movie Test');
		});
	});

	describe('createMovie Mutation', () => {
		it('should create a movie', async () => {
			const result = await executeGraphQL(`
				mutation {
					createMovie(data: {
						title: "GraphQL Created Movie"
						releaseDate: "2024-06-15"
						director: "GraphQL Director"
						synopsis: "Created via GraphQL mutation"
					}) {
						id
						title
						releaseDate
						director
					}
				}
			`);

			expect(result.errors).toBeUndefined();
			expect(result.data.createMovie).not.toBeNull();
			expect(result.data.createMovie.title).toBe('GraphQL Created Movie');

			createdDocIds.movies.push(result.data.createMovie.id);
		});
	});

	describe('allMovie Query with filtering', () => {
		it('should filter movies by director', async () => {
			// Create and publish test movies
			await localAPI.collections.movie
				.create(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					{
						title: 'Movie by Specific Director',
						releaseDate: '2024-01-01',
						director: 'Specific Director'
					},
					{ publish: true }
				)
				.then((m) => createdDocIds.movies.push(m.document.id));

			const result = await executeGraphQL(`
				query {
					allMovie(where: { director: { equals: "Specific Director" } }) {
						id
						title
						director
					}
				}
			`);

			expect(result.errors).toBeUndefined();
			expect(result.data.allMovie.length).toBeGreaterThanOrEqual(1);
			result.data.allMovie.forEach((movie: any) => {
				if (movie.title.includes('Specific Director')) {
					expect(movie.director).toBe('Specific Director');
				}
			});
		});
	});
});
