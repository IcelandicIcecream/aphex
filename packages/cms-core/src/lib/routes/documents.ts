// Aphex CMS Document API Handlers
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { authToContext } from '../local-api/auth-helpers';
import { PermissionError } from '../local-api/permissions';
import { cmsLogger } from '../utils/logger';
import { createDocumentRequest, listDocumentsQuery } from '../api/schemas/documents';

// Default values for API
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGE = 1;

// GET /api/documents - Simple document listing with basic filters
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const { localAPI } = locals.aphexCMS;
		const context = authToContext(locals.auth);

		// Parse + validate query params with zod
		const rawQuery = Object.fromEntries(url.searchParams.entries());
		const parsedQuery = listDocumentsQuery.safeParse(rawQuery);
		if (!parsedQuery.success) {
			return json(
				{
					success: false,
					error: 'Invalid query parameters',
					issues: parsedQuery.error.issues
				},
				{ status: 400 }
			);
		}
		const q = parsedQuery.data;

		const docType = q.type ?? q.docType;
		const status = q.status;
		const sortParam = Array.isArray(q.sort) ? q.sort.join(',') : q.sort;
		const perspective = q.perspective ?? 'draft';
		const includeChildOrganizations = q.includeChildOrganizations;
		const filterOrganizationIds = q.filterOrganizationIds;

		const page = q.page ?? DEFAULT_PAGE;
		const pageSize = q.pageSize ?? q.limit ?? DEFAULT_PAGE_SIZE;
		const offset = (page - 1) * pageSize;
		const depth = q.depth ?? 0;

		if (!docType) {
			return json(
				{
					success: false,
					error: 'Bad Request',
					message: 'Document type is required. Use ?type=page or ?docType=page'
				},
				{ status: 400 }
			);
		}

		// Get collection API (TypeScript-safe)
		const collection = localAPI.collections[docType];
		if (!collection) {
			return json(
				{
					success: false,
					error: 'Invalid document type',
					message: `Collection '${docType}' not found. Available: ${localAPI.getCollectionNames().join(', ')}`
				},
				{ status: 400 }
			);
		}

		// Build where clause from query params
		const where: Record<string, any> = {};
		if (status) {
			where.status = { equals: status };
		}

		// Query via LocalAPI
		const result = await collection.find(context, {
			where: Object.keys(where).length > 0 ? where : undefined,
			limit: pageSize,
			offset: offset,
			depth: depth,
			sort: sortParam || undefined,
			perspective,
			includeChildOrganizations,
			filterOrganizationIds
		});

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
		cmsLogger.error('Failed to fetch documents:', error);

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
				error: 'Failed to fetch documents',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

// POST /api/documents - Create new document
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { localAPI } = locals.aphexCMS;
		const context = authToContext(locals.auth);
		const rawBody = await request.json();
		const parsed = createDocumentRequest.safeParse(rawBody);
		if (!parsed.success) {
			return json(
				{
					success: false,
					error: 'Invalid request body',
					issues: parsed.error.issues
				},
				{ status: 400 }
			);
		}

		const documentType = parsed.data.type;
		const documentData = (parsed.data.draftData ?? parsed.data.data)!;
		const shouldPublish = parsed.data.publish ?? false;

		// Get collection API (TypeScript-safe)
		const collection = localAPI.collections[documentType];
		if (!collection) {
			return json(
				{
					success: false,
					error: 'Invalid document type',
					message: `Collection '${documentType}' not found. Available: ${localAPI.getCollectionNames().join(', ')}`
				},
				{ status: 400 }
			);
		}

		// Create via LocalAPI (permission checks and validation happen inside)
		const result = await collection.create(context, documentData, {
			publish: shouldPublish
		});

		return json(
			{
				success: true,
				data: result.document,
				validation: result.validation
			},
			{ status: 201 }
		);
	} catch (error) {
		cmsLogger.error('Failed to create document:', error);

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

		// Validation errors from publish attempts
		if (error instanceof Error && error.message.includes('validation errors')) {
			return json(
				{
					success: false,
					error: 'Validation failed',
					message: error.message
				},
				{ status: 400 }
			);
		}

		return json(
			{
				success: false,
				error: 'Failed to create document',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
