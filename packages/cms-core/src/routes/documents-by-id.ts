// Aphex CMS Document by ID API Handlers
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// GET /api/documents/[id] - Get document by ID
export const GET: RequestHandler = async ({ params, url, locals }) => {
	try {
		const { databaseAdapter } = locals.aphexCMS;
		const auth = locals.auth;
		const { id } = params;

		if (!auth) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		if (!id) {
			return json({ success: false, error: 'Document ID is required' }, { status: 400 });
		}

		// Parse depth parameter
		const depthParam = url.searchParams.get('depth');
		const depth = depthParam ? parseInt(depthParam) : 0;
		const clampedDepth = isNaN(depth) ? 0 : Math.max(0, Math.min(depth, 5)); // Clamp between 0-5

		const document = await databaseAdapter.findByDocId(auth.organizationId, id, clampedDepth);

		if (!document) {
			return json({ success: false, error: 'Document not found' }, { status: 404 });
		}

		return json({
			success: true,
			data: document
		});
	} catch (error) {
		console.error('Failed to fetch document:', error);
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
export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		const { databaseAdapter } = locals.aphexCMS;
		const auth = locals.auth;
		const { id } = params;
		const body = await request.json();

		if (!auth) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const documentData = body.draftData;

		if (!id) {
			return json({ success: false, error: 'Document ID is required' }, { status: 400 });
		}

		// NO VALIDATION FOR DRAFTS - Sanity-style: drafts can have any state
		// Validation only happens on publish
		const updatedDocument = await databaseAdapter.updateDocDraft(auth.organizationId, id, documentData);

		if (!updatedDocument) {
			return json({ success: false, error: 'Document not found' }, { status: 404 });
		}

		return json({
			success: true,
			data: updatedDocument
		});
	} catch (error) {
		console.error('Failed to update document:', error);
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
		const { databaseAdapter } = locals.aphexCMS;
		const auth = locals.auth;
		const { id } = params;

		if (!auth) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		if (!id) {
			return json({ success: false, error: 'Document ID is required' }, { status: 400 });
		}

		const success = await databaseAdapter.deleteDocById(auth.organizationId, id);

		if (!success) {
			return json({ success: false, error: 'Document not found' }, { status: 404 });
		}

		return json({
			success: true,
			message: 'Document deleted successfully'
		});
	} catch (error) {
		console.error('Failed to delete document:', error);
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
