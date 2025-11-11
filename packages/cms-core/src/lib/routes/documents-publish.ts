// Aphex CMS Document Publish API Handlers
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { authToContext } from '../local-api/auth-helpers';
import { PermissionError } from '../local-api/permissions';

// POST /api/documents/[id]/publish - Publish document
export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		const { localAPI, databaseAdapter } = locals.aphexCMS;
		const context = authToContext(locals.auth);
		const { id } = params;

		if (!id) {
			return json(
				{
					success: false,
					error: 'Missing document ID',
					message: 'Document ID is required'
				},
				{ status: 400 }
			);
		}

		// Fetch document to get its type
		const rawDoc = await databaseAdapter.findByDocId(context.organizationId, id, 0);
		if (!rawDoc) {
			return json(
				{
					success: false,
					error: 'Document not found',
					message: 'Document may not exist'
				},
				{ status: 404 }
			);
		}

		// Get collection API (TypeScript-safe)
		const collection = localAPI.collections[rawDoc.type];
		if (!collection) {
			return json(
				{
					success: false,
					error: 'Invalid document type',
					message: `Collection '${rawDoc.type}' not found`
				},
				{ status: 400 }
			);
		}

		// Publish via LocalAPI (permission checks and validation happen inside)
		const publishedDocument = await collection.publish(context, id);

		if (!publishedDocument) {
			return json(
				{
					success: false,
					error: 'Document not found or cannot be published',
					message: 'Document may not have draft content to publish'
				},
				{ status: 404 }
			);
		}

		return json({
			success: true,
			data: publishedDocument,
			message: 'Document published successfully'
		});
	} catch (error) {
		console.error('Failed to publish document:', error);

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

		// Validation errors from LocalAPI are regular errors with specific messages
		if (error instanceof Error && error.message.includes('validation errors')) {
			return json(
				{
					success: false,
					error: 'Cannot publish: validation errors',
					message: error.message
				},
				{ status: 400 }
			);
		}

		return json(
			{
				success: false,
				error: 'Failed to publish document',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

// DELETE /api/documents/[id]/publish - Unpublish document
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		const { localAPI, databaseAdapter } = locals.aphexCMS;
		const context = authToContext(locals.auth);
		const { id } = params;

		if (!id) {
			return json(
				{
					success: false,
					error: 'Missing document ID',
					message: 'Document ID is required'
				},
				{ status: 400 }
			);
		}

		// Fetch document to get its type
		const rawDoc = await databaseAdapter.findByDocId(context.organizationId, id, 0);
		if (!rawDoc) {
			return json(
				{
					success: false,
					error: 'Document not found',
					message: `No document found with ID: ${id}`
				},
				{ status: 404 }
			);
		}

		// Get collection API (TypeScript-safe)
		const collection = localAPI.collections[rawDoc.type];
		if (!collection) {
			return json(
				{
					success: false,
					error: 'Invalid document type',
					message: `Collection '${rawDoc.type}' not found`
				},
				{ status: 400 }
			);
		}

		// Unpublish via LocalAPI (permission checks happen inside)
		const unpublishedDocument = await collection.unpublish(context, id);

		if (!unpublishedDocument) {
			return json(
				{
					success: false,
					error: 'Document not found',
					message: `No document found with ID: ${id}`
				},
				{ status: 404 }
			);
		}

		return json({
			success: true,
			data: unpublishedDocument,
			message: 'Document unpublished successfully'
		});
	} catch (error) {
		console.error('Failed to unpublish document:', error);

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
				error: 'Failed to unpublish document',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
