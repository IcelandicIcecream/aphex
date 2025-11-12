/**
 * Comprehensive HTTP/REST API tests
 * Tests all REST endpoints for CRUD operations
 *
 * Run: pnpm test comprehensive-http-api
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createLocalAPI } from '@aphexcms/cms-core/server';
import { db } from '$lib/server/db';
import cmsConfig from '../aphex.config';
import type { CMSInstances } from '@aphexcms/cms-core/server';

const TEST_ORG_ID = '8a5c55fe-f89e-4e73-93b3-aba660e8e26b';

let localAPI: ReturnType<typeof createLocalAPI>;
let cmsInstances: CMSInstances;

// Track created document IDs for cleanup
const createdDocIds = {
	pages: [] as string[],
	catalogs: [] as string[],
	movies: [] as string[]
};

// Mock auth - in real tests, you'd use proper auth tokens
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
}, 30000);

afterEach(async () => {
	// Clean up created documents after each test
	for (const id of createdDocIds.pages) {
		try {
			await localAPI.collections.page.delete({ organizationId: TEST_ORG_ID, overrideAccess: true }, id);
		} catch (e) {
			// Ignore errors if already deleted
		}
	}
	for (const id of createdDocIds.catalogs) {
		try {
			await localAPI.collections.catalog.delete({ organizationId: TEST_ORG_ID, overrideAccess: true }, id);
		} catch (e) {
			// Ignore errors if already deleted
		}
	}
	for (const id of createdDocIds.movies) {
		try {
			await localAPI.collections.movie.delete({ organizationId: TEST_ORG_ID, overrideAccess: true }, id);
		} catch (e) {
			// Ignore errors if already deleted
		}
	}
	// Clear tracking arrays
	createdDocIds.pages = [];
	createdDocIds.catalogs = [];
	createdDocIds.movies = [];
});

// Helper function to simulate HTTP requests
async function makeRequest(method: string, path: string, body?: any) {
	// Import the route handlers
	const documentsModule = await import('../src/routes/api/documents/+server.js');
	const documentByIdModule = await import('../src/routes/api/documents/[id]/+server.js');
	const publishModule = await import('../src/routes/api/documents/[id]/publish/+server.js');

	// Create mock request and locals
	const url = new URL(path, 'http://localhost');
	const request = new Request(url, {
		method,
		body: body ? JSON.stringify(body) : undefined,
		headers: {
			'content-type': 'application/json'
		}
	});

	const locals: any = {
		auth: mockAuth,
		aphexCMS: cmsInstances
	};

	// Extract ID from path if present
	const idMatch = path.match(/\/api\/documents\/([^/]+)/);
	const params = idMatch ? { id: idMatch[1] } : {};

	const event: any = {
		request,
		locals,
		url,
		params,
		fetch: global.fetch
	};

	// Route to correct handler
	if (path.includes('/publish')) {
		if (method === 'POST') {
			return publishModule.POST(event);
		} else if (method === 'DELETE') {
			return publishModule.DELETE(event);
		}
	} else if (path.match(/\/api\/documents\/[^/]+$/)) {
		if (method === 'GET') {
			return documentByIdModule.GET(event);
		} else if (method === 'PUT') {
			return documentByIdModule.PUT(event);
		} else if (method === 'DELETE') {
			return documentByIdModule.DELETE(event);
		}
	} else {
		if (method === 'GET') {
			return documentsModule.GET(event);
		} else if (method === 'POST') {
			return documentsModule.POST(event);
		}
	}

	throw new Error(`Unknown route: ${method} ${path}`);
}

describe('HTTP API - Page Endpoints', () => {
	describe('POST /api/documents (Create)', () => {
		it('should create a page via HTTP', async () => {
			const response = await makeRequest('POST', '/api/documents', {
				type: 'page',
				data: {
					title: 'HTTP Test Page',
					slug: 'http-test-page',
					published: false
				}
			});

			expect(response.status).toBe(201);
			const json = await response.json();
			expect(json.success).toBe(true);
			expect(json.data).toBeDefined();
			expect(json.data.title).toBe('HTTP Test Page');

			createdDocIds.pages.push(json.data.id);
		});

		it('should create and publish a page', async () => {
			const response = await makeRequest('POST', '/api/documents', {
				type: 'page',
				data: {
					title: 'HTTP Publish Test',
					slug: 'http-publish-test',
					published: true
				},
				publish: true
			});

			expect(response.status).toBe(201);
			const json = await response.json();
			expect(json.data._meta.status).toBe('published');

			createdDocIds.pages.push(json.data.id);
		});

		it('should fail to publish page without required fields', async () => {
			// Create draft without slug is OK, but publishing should fail
			const createResponse = await makeRequest('POST', '/api/documents', {
				type: 'page',
				data: {
					title: 'Missing Slug'
				}
			});

			expect(createResponse.status).toBe(201);
			const createJson = await createResponse.json();

			// Try to publish - should fail validation
			const publishResponse = await makeRequest('POST', `/api/documents/${createJson.data.id}/publish`);

			expect(publishResponse.status).toBeGreaterThanOrEqual(400);
		});
	});

	describe('GET /api/documents (List)', () => {
		it('should list pages with pagination', async () => {
			// Create test pages
			for (let i = 1; i <= 3; i++) {
				const page = await localAPI.collections.page.create(
					{ organizationId: TEST_ORG_ID, overrideAccess: true },
					{
						title: `HTTP List Test ${i}`,
						slug: `http-list-test-${i}`,
						published: i % 2 === 0
					}
				);
				createdDocIds.pages.push(page.id);
			}

			const response = await makeRequest('GET', '/api/documents?type=page&limit=2');

			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json.success).toBe(true);
			expect(json.data).toBeDefined();
			expect(json.pagination).toBeDefined();
			expect(json.pagination.pageSize).toBe(2);
		});

		it('should filter pages by published status', async () => {
			// Create test pages
			const published = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'Published HTTP Test',
					slug: 'published-http-test',
					published: true
				},
				{ publish: true }
			);
			createdDocIds.pages.push(published.id);

			const draft = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'Draft HTTP Test',
					slug: 'draft-http-test',
					published: false
				}
			);
			createdDocIds.pages.push(draft.id);

			const response = await makeRequest('GET', '/api/documents?type=page&status=published');

			expect(response.status).toBe(200);
			const json = await response.json();
			// All returned docs should be published
			json.data.forEach((doc: any) => {
				if (doc.title.includes('HTTP Test')) {
					expect(doc.published).toBe(true);
				}
			});
		});
	});

	describe('GET /api/documents/:id (Get by ID)', () => {
		it('should get a page by ID', async () => {
			// Create a page
			const created = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'HTTP Get by ID Test',
					slug: 'http-get-by-id-test',
					published: false
				}
			);
			createdDocIds.pages.push(created.id);

			const response = await makeRequest('GET', `/api/documents/${created.id}`);

			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json.success).toBe(true);
			expect(json.data.id).toBe(created.id);
			expect(json.data.title).toBe('HTTP Get by ID Test');
		});

		it('should return 404 for non-existent ID', async () => {
			const response = await makeRequest('GET', '/api/documents/00000000-0000-0000-0000-000000000000');

			expect(response.status).toBe(404);
		});
	});

	describe('PUT /api/documents/:id (Update)', () => {
		it('should update a page', async () => {
			// Create a page
			const created = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'HTTP Update Test',
					slug: 'http-update-test',
					published: false
				}
			);
			createdDocIds.pages.push(created.id);

			// Update it
			const response = await makeRequest('PUT', `/api/documents/${created.id}`, {
				data: {
					title: 'HTTP Updated Title'
				}
			});

			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json.success).toBe(true);
			expect(json.data.title).toBe('HTTP Updated Title');
		});

		it('should update and publish a page', async () => {
			// Create a draft page
			const created = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'HTTP Update Publish Test',
					slug: 'http-update-publish-test',
					published: false
				}
			);
			createdDocIds.pages.push(created.id);

			// Update with all required fields and publish
			const response = await makeRequest('PUT', `/api/documents/${created.id}`, {
				data: {
					title: 'Updated Title',
					slug: 'http-update-publish-test', // Must include all required fields
					published: true
				},
				publish: true
			});

			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json.data._meta.status).toBe('published');
		});
	});

	describe('DELETE /api/documents/:id (Delete)', () => {
		it('should delete a page', async () => {
			// Create a page
			const created = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'HTTP Delete Test',
					slug: 'http-delete-test',
					published: false
				}
			);

			// Delete it
			const response = await makeRequest('DELETE', `/api/documents/${created.id}`);

			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json.success).toBe(true);

			// Verify it's gone
			const found = await localAPI.collections.page.findByID(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				created.id
			);
			expect(found).toBeNull();
		});
	});

	describe('POST /api/documents/:id/publish (Publish)', () => {
		it('should publish a page', async () => {
			// Create a draft page
			const created = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'HTTP Publish Endpoint Test',
					slug: 'http-publish-endpoint-test',
					published: false
				}
			);
			createdDocIds.pages.push(created.id);

			// Publish it
			const response = await makeRequest('POST', `/api/documents/${created.id}/publish`);

			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json.success).toBe(true);
			expect(json.data._meta.status).toBe('published');
		});
	});

	describe('DELETE /api/documents/:id/publish (Unpublish)', () => {
		it('should unpublish a page', async () => {
			// Create and publish a page
			const created = await localAPI.collections.page.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'HTTP Unpublish Test',
					slug: 'http-unpublish-test',
					published: true
				},
				{ publish: true }
			);
			createdDocIds.pages.push(created.id);

			// Unpublish it
			const response = await makeRequest('DELETE', `/api/documents/${created.id}/publish`);

			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json.success).toBe(true);
			expect(json.data._meta.status).toBe('draft');
		});
	});
});

describe('HTTP API - Catalog Endpoints', () => {
	describe('POST /api/documents (Create Catalog)', () => {
		it('should create a catalog with items', async () => {
			const response = await makeRequest('POST', '/api/documents', {
				type: 'catalog',
				data: {
					title: 'HTTP Catalog Test',
					description: 'Testing catalog creation via HTTP',
					items: [
						{
							_type: 'catalogItem',
							title: 'Item 1',
							shortDescription: 'First item',
							price: 19.99
						},
						{
							_type: 'catalogItem',
							title: 'Item 2',
							shortDescription: 'Second item',
							price: 29.99
						}
					],
					published: false
				}
			});

			expect(response.status).toBe(201);
			const json = await response.json();
			expect(json.success).toBe(true);
			expect(json.data.items).toHaveLength(2);

			createdDocIds.catalogs.push(json.data.id);
		});
	});

	describe('GET /api/documents (List Catalogs)', () => {
		it('should list catalogs', async () => {
			const response = await makeRequest('GET', '/api/documents?type=catalog&limit=10');

			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json.success).toBe(true);
			expect(Array.isArray(json.data)).toBe(true);
		});
	});

	describe('PUT /api/documents/:id (Update Catalog)', () => {
		it('should update catalog items', async () => {
			// Create a catalog
			const created = await localAPI.collections.catalog.create(
				{ organizationId: TEST_ORG_ID, overrideAccess: true },
				{
					title: 'HTTP Update Catalog',
					description: 'For update testing',
					items: [
						{
							_type: 'catalogItem',
							title: 'Original Item',
							shortDescription: 'Original',
							price: 10
						}
					],
					published: false
				}
			);
			createdDocIds.catalogs.push(created.id);

			// Update items
			const response = await makeRequest('PUT', `/api/documents/${created.id}`, {
				data: {
					items: [
						{
							_type: 'catalogItem',
							title: 'Updated Item',
							shortDescription: 'Updated',
							price: 15
						},
						{
							_type: 'catalogItem',
							title: 'New Item',
							shortDescription: 'New',
							price: 20
						}
					]
				}
			});

			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json.data.items).toHaveLength(2);
			expect(json.data.items[0].title).toBe('Updated Item');
		});
	});
});

describe('HTTP API - Movie Endpoints', () => {
	describe('POST /api/documents (Create Movie)', () => {
		it('should create a movie', async () => {
			const response = await makeRequest('POST', '/api/documents', {
				type: 'movie',
				data: {
					title: 'HTTP Movie Test',
					releaseDate: '2024-01-01',
					director: 'Test Director',
					synopsis: 'A test movie'
				}
			});

			expect(response.status).toBe(201);
			const json = await response.json();
			expect(json.success).toBe(true);
			expect(json.data.title).toBe('HTTP Movie Test');

			createdDocIds.movies.push(json.data.id);
		});
	});

	describe('GET /api/documents (List Movies)', () => {
		it('should list movies', async () => {
			const response = await makeRequest('GET', '/api/documents?type=movie&limit=10');

			expect(response.status).toBe(200);
			const json = await response.json();
			expect(json.success).toBe(true);
			expect(Array.isArray(json.data)).toBe(true);
		});
	});
});
