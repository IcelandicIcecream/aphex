// Aphex CMS Document Query API - Complex filtering with POST
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { authToContext } from '../local-api/auth-helpers';
import { PermissionError } from '../local-api/permissions';
import type { FindOptions } from '../types/filters';

// Default values
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGE = 1;

/**
 * POST /api/documents/query - Advanced document querying with complex filters
 *
 * Accepts LocalAPI FindOptions in request body for full filtering power
 *
 * @example
 * POST /api/documents/query
 * {
 *   "type": "page",
 *   "where": {
 *     "status": { "equals": "published" },
 *     "hero.heading": { "contains": "Welcome" },
 *     "publishedAt": { "gte": "2024-01-01" }
 *   },
 *   "limit": 20,
 *   "page": 1,
 *   "sort": ["-publishedAt", "title"],
 *   "depth": 1,
 *   "perspective": "published",
 *   "filterOrganizationIds": ["org_child1", "org_child2"],
 *   "includeChildOrganizations": false
 * }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { localAPI } = locals.aphexCMS;
		const context = authToContext(locals.auth);
		const body = await request.json();

		// Extract document type
		const documentType = body.type;
		if (!documentType) {
			return json(
				{
					success: false,
					error: 'Bad Request',
					message: 'Document type is required in request body'
				},
				{ status: 400 }
			);
		}

		// Check if collection exists
		if (!localAPI.hasCollection(documentType)) {
			return json(
				{
					success: false,
					error: 'Invalid document type',
					message: `Collection '${documentType}' not found. Available: ${localAPI.getCollectionNames().join(', ')}`
				},
				{ status: 400 }
			);
		}

		// Parse pagination - support both page-based and offset-based
		const page = body.page ? Math.max(1, parseInt(body.page)) : DEFAULT_PAGE;
		const pageSize = body.pageSize || body.limit || DEFAULT_PAGE_SIZE;
		const offset = body.offset !== undefined ? body.offset : (page - 1) * pageSize;

		// Build FindOptions from request body
		const findOptions: FindOptions = {
			where: body.where,
			limit: pageSize,
			offset: offset,
			sort: body.sort,
			depth: body.depth !== undefined ? Math.max(0, Math.min(body.depth, 5)) : 0,
			select: body.select,
			perspective: body.perspective || 'draft',
			includeChildOrganizations: body.includeChildOrganizations,
			filterOrganizationIds: body.filterOrganizationIds
		};

		// Query via LocalAPI
		const result = await localAPI.collections[documentType]!.find(context, findOptions);

		return json({
			success: true,
			data: result.docs,
			pagination: {
				total: result.totalDocs,
				page: result.page,
				pageSize: result.limit,
				totalPages: result.totalPages,
				hasNextPage: result.hasNextPage,
				hasPrevPage: result.hasPrevPage
			}
		});
	} catch (error) {
		console.error('Failed to query documents:', error);

		if (error instanceof PermissionError) {
			return json(
				{
					success: false,
					error: 'Forbidden',
					message: error.message
				},
				{ status: 403 }
			);
		}

		return json(
			{
				success: false,
				error: 'Failed to query documents',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
