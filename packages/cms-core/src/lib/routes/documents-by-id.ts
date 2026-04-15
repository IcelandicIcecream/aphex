// Aphex CMS Document by ID API Handlers
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { authToContext } from '../local-api/auth-helpers';
import { PermissionError } from '../local-api/permissions';
import { cmsLogger } from '../utils/logger';
import { updateDocumentRequest } from '../api/schemas/documents';

// GET /api/documents/[id] - Get document by ID
// TODO ENABLE CHILDREN ORG ACCESS BY DEFAULT - BECAUSE IF A PARENT ORG IS TRYING TO ACCESS A CHILD ORG. It should already have access to said id.
export const GET: RequestHandler = async ({ params, url, locals }) => {
	try {
		const { localAPI } = locals.aphexCMS;
		const context = authToContext(locals.auth);
		const { id } = params;

		if (!id) {
			return json({ success: false, error: 'Document ID is required' }, { status: 400 });
		}

		// Parse query params
		const depthParam = url.searchParams.get('depth');
		const depth = depthParam ? Math.max(0, Math.min(parseInt(depthParam), 5)) : 0;
		const perspective = (url.searchParams.get('perspective') as 'draft' | 'published') || 'draft';

		// First, fetch document to get its type (uses hierarchy-aware lookup, no RLS transaction)
		const result = await localAPI.findDocumentById(context, id);
		if (!result) {
			return json({ success: false, error: 'Document not found' }, { status: 404 });
		}

		// Get collection API (TypeScript-safe)
		const collection = localAPI.collections[result.type];
		if (!collection) {
			return json(
				{
					success: false,
					error: 'Invalid document type',
					message: `Collection '${result.type}' not found`
				},
				{ status: 400 }
			);
		}

		// Now use LocalAPI for permission-checked retrieval
		const document = await collection.findByID(context, id, {
			depth,
			perspective
		});

		if (!document) {
			return json({ success: false, error: 'Document not found' }, { status: 404 });
		}

		return json({
			success: true,
			data: document
		});
	} catch (error) {
		cmsLogger.error('Failed to fetch document:', error);

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
				error: 'Failed to fetch document',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

// PUT /api/documents/[id] - Update document
// TODO ENABLE CHILDREN ORG ACCESS BY DEFAULT - BECAUSE IF A PARENT ORG IS TRYING TO ACCESS A CHILD ORG. It should already have access to said id.
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		const { localAPI } = locals.aphexCMS;
		const context = authToContext(locals.auth);
		const { id } = params;

		if (!id) {
			return json({ success: false, error: 'Document ID is required' }, { status: 400 });
		}

		const rawBody = await request.json();
		const parsed = updateDocumentRequest.safeParse(rawBody);
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

		const documentData = parsed.data.draftData ?? parsed.data.data;
		if (!documentData) {
			return json({ success: false, error: 'Document data is required' }, { status: 400 });
		}
		const shouldPublish = parsed.data.publish ?? false;

		// Fetch document to get its type (hierarchy-aware, no RLS transaction)
		const found = await localAPI.findDocumentById(context, id);
		if (!found) {
			return json({ success: false, error: 'Document not found' }, { status: 404 });
		}

		// Get collection API (TypeScript-safe)
		const collection = localAPI.collections[found.type];
		if (!collection) {
			return json(
				{
					success: false,
					error: 'Invalid document type',
					message: `Collection '${found.type}' not found`
				},
				{ status: 400 }
			);
		}

		// Update via LocalAPI (permission checks and validation happen inside)
		const result = await collection.update(context, id, documentData, {
			publish: shouldPublish
		});

		if (!result) {
			return json({ success: false, error: 'Document not found' }, { status: 404 });
		}

		return json({
			success: true,
			data: result.document,
			validation: result.validation
		});
	} catch (error) {
		cmsLogger.error('Failed to update document:', error);

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
				error: 'Failed to update document',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

// DELETE /api/documents/[id] - Delete document
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		const { localAPI } = locals.aphexCMS;
		const context = authToContext(locals.auth);
		const { id } = params;

		if (!id) {
			return json({ success: false, error: 'Document ID is required' }, { status: 400 });
		}

		// Fetch document to get its type (hierarchy-aware, no RLS transaction)
		const result = await localAPI.findDocumentById(context, id);
		if (!result) {
			return json({ success: false, error: 'Document not found' }, { status: 404 });
		}

		// Get collection API (TypeScript-safe)
		const collection = localAPI.collections[result.type];
		if (!collection) {
			return json(
				{
					success: false,
					error: 'Invalid document type',
					message: `Collection '${result.type}' not found`
				},
				{ status: 400 }
			);
		}

		// Delete via LocalAPI (permission checks happen inside)
		const success = await collection.delete(context, id);

		if (!success) {
			return json({ success: false, error: 'Document not found' }, { status: 404 });
		}

		return json({
			success: true,
			message: 'Document deleted successfully'
		});
	} catch (error) {
		cmsLogger.error('Failed to delete document:', error);

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
				error: 'Failed to delete document',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
