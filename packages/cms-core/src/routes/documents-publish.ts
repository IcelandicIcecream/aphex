// Aphex CMS Document Publish API Handlers
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { validateField } from '../field-validation/utils.js';
import { canWrite } from '../types/auth.js';

// POST /api/documents/[id]/publish - Publish document
export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		const { databaseAdapter, cmsEngine } = locals.aphexCMS;
		const auth = locals.auth;
		const { id } = params;

		if (!auth) {
			return json(
				{
					success: false,
					error: 'Unauthorized',
					message: 'Authentication required'
				},
				{ status: 401 }
			);
		}

		// Check write permissions (viewers are read-only)
		if (!canWrite(auth)) {
			return json(
				{
					success: false,
					error: 'Forbidden',
					message: 'You do not have permission to publish documents. Viewers have read-only access.'
				},
				{ status: 403 }
			);
		}

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

		// Get document to validate
		const document = await databaseAdapter.findByDocId(auth.organizationId, id);
		if (!document || !document.draftData) {
			return json(
				{
					success: false,
					error: 'Document not found or cannot be published',
					message: 'Document may not exist or may not have draft content'
				},
				{ status: 404 }
			);
		}

		// Get schema for validation (from config to preserve validation functions)
		const schema = cmsEngine.getSchemaTypeByName(document.type);
		if (!schema) {
			return json(
				{
					success: false,
					error: 'Invalid document type',
					message: `Schema type '${document.type}' not found`
				},
				{ status: 400 }
			);
		}

		// VALIDATE before publishing - block if errors exist
		const validationErrors: Array<{ field: string; errors: string[] }> = [];

		for (const field of schema.fields) {
			const value = document.draftData[field.name];
			const result = await validateField(field, value, document.draftData);

			if (!result.isValid) {
				const errorMessages = result.errors
					.filter((e) => e.level === 'error')
					.map((e) => e.message);

				if (errorMessages.length > 0) {
					validationErrors.push({
						field: field.name,
						errors: errorMessages
					});
				}
			}
		}

		// Block publishing if validation errors exist
		if (validationErrors.length > 0) {
			return json(
				{
					success: false,
					error: 'Cannot publish: validation errors',
					message: 'Please fix all validation errors before publishing',
					validationErrors
				},
				{ status: 400 }
			);
		}

		// All validation passed - proceed with publish
		const publishedDocument = await databaseAdapter.publishDoc(auth.organizationId, id);

		if (!publishedDocument) {
			return json(
				{
					success: false,
					error: 'Document not found or cannot be published',
					message: 'Document may not exist or may not have draft content'
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
		const { databaseAdapter } = locals.aphexCMS;
		const auth = locals.auth;
		const { id } = params;

		if (!auth) {
			return json(
				{
					success: false,
					error: 'Unauthorized',
					message: 'Authentication required'
				},
				{ status: 401 }
			);
		}

		// Check write permissions (viewers are read-only)
		if (!canWrite(auth)) {
			return json(
				{
					success: false,
					error: 'Forbidden',
					message: 'You do not have permission to unpublish documents. Viewers have read-only access.'
				},
				{ status: 403 }
			);
		}

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

		const unpublishedDocument = await databaseAdapter.unpublishDoc(auth.organizationId, id);

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
