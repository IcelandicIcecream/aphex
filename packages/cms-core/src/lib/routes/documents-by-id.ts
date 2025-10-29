// Aphex CMS Document by ID API Handlers
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import type { Document } from '../types/document.js';
import { canWrite } from '../types/auth.js';

// GET /api/documents/[id] - Get document by ID
export const GET: RequestHandler = async ({ params, url, locals }) => {
	try {
		const { databaseAdapter, auth: authProvider } = locals.aphexCMS;
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

		// Populate createdBy user info if available
		if (document.createdBy && authProvider) {
			try {
				if (typeof document.createdBy === 'string') {
					const user = await authProvider.getUserById(document.createdBy);
					if (user) {
						document.createdBy = {
							id: user.id,
							name: user.name,
							email: user.email
						};
					}
				}
			} catch (err) {
				// If user fetch fails, keep the user ID
				console.warn('[documents-by-id] Failed to populate createdBy user:', err);
			}
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

		// Check write permissions (viewers are read-only)
		if (!canWrite(auth)) {
			return json(
				{
					success: false,
					error: 'Forbidden',
					message: 'You do not have permission to update documents. Viewers have read-only access.'
				},
				{ status: 403 }
			);
		}

		const documentData = body.draftData;

		if (!id) {
			return json({ success: false, error: 'Document ID is required' }, { status: 400 });
		}

		let updatedDocument: Document | null;

		// NO VALIDATION FOR DRAFTS - Sanity-style: drafts can have any state
		// Validation only happens on publish
		if (auth.type == 'session') {
			updatedDocument = await databaseAdapter.updateDocDraft(
				auth.organizationId,
				id,
				documentData,
				auth.user.id
			);
		} else {
			updatedDocument = await databaseAdapter.updateDocDraft(
				auth.organizationId,
				id,
				documentData,
				auth.keyId
			);
		}

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

		// Check write permissions (viewers are read-only)
		if (!canWrite(auth)) {
			return json(
				{
					success: false,
					error: 'Forbidden',
					message: 'You do not have permission to delete documents. Viewers have read-only access.'
				},
				{ status: 403 }
			);
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
