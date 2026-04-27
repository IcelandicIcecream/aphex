import { Hono } from 'hono';
import { authToContext } from '../../../local-api/auth-helpers';
import { PermissionError } from '../../../local-api/permissions';
import { cmsLogger } from '../../../utils/logger';
import type { AphexEnv } from '../index';

export const documentsPublishRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.post('/:id/publish', async (c) => {
		try {
			const { localAPI } = c.var.aphexCMS;
			const context = authToContext(c.var.auth);
			const id = c.req.param('id');

			if (!id) {
				return c.json(
					{
						success: false,
						error: 'Missing document ID',
						message: 'Document ID is required'
					},
					400
				);
			}

			const found = await localAPI.findDocumentById(context, id);
			if (!found) {
				return c.json(
					{
						success: false,
						error: 'Document not found',
						message: 'Document may not exist'
					},
					404
				);
			}

			const collection = localAPI.collections[found.type];
			if (!collection) {
				return c.json(
					{
						success: false,
						error: 'Invalid document type',
						message: `Collection '${found.type}' not found`
					},
					400
				);
			}

			const publishedDocument = await collection.publish(context, id);
			if (!publishedDocument) {
				return c.json(
					{
						success: false,
						error: 'Document not found or cannot be published',
						message: 'Document may not have draft content to publish'
					},
					404
				);
			}

			return c.json({
				success: true,
				data: publishedDocument,
				message: 'Document published successfully'
			});
		} catch (error) {
			cmsLogger.error('Failed to publish document:', error);
			if (error instanceof PermissionError) {
				return c.json(
					{ success: false, error: 'Forbidden', message: error.message },
					403
				);
			}
			if (error instanceof Error && error.message.includes('validation errors')) {
				return c.json(
					{
						success: false,
						error: 'Cannot publish: validation errors',
						message: error.message
					},
					400
				);
			}
			return c.json(
				{
					success: false,
					error: 'Failed to publish document',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	})
	.delete('/:id/publish', async (c) => {
		try {
			const { localAPI } = c.var.aphexCMS;
			const context = authToContext(c.var.auth);
			const id = c.req.param('id');

			if (!id) {
				return c.json(
					{
						success: false,
						error: 'Missing document ID',
						message: 'Document ID is required'
					},
					400
				);
			}

			const found = await localAPI.findDocumentById(context, id);
			if (!found) {
				return c.json(
					{
						success: false,
						error: 'Document not found',
						message: `No document found with ID: ${id}`
					},
					404
				);
			}

			const collection = localAPI.collections[found.type];
			if (!collection) {
				return c.json(
					{
						success: false,
						error: 'Invalid document type',
						message: `Collection '${found.type}' not found`
					},
					400
				);
			}

			const unpublishedDocument = await collection.unpublish(context, id);
			if (!unpublishedDocument) {
				return c.json(
					{
						success: false,
						error: 'Document not found',
						message: `No document found with ID: ${id}`
					},
					404
				);
			}

			return c.json({
				success: true,
				data: unpublishedDocument,
				message: 'Document unpublished successfully'
			});
		} catch (error) {
			cmsLogger.error('Failed to unpublish document:', error);
			if (error instanceof PermissionError) {
				return c.json(
					{ success: false, error: 'Forbidden', message: error.message },
					403
				);
			}
			return c.json(
				{
					success: false,
					error: 'Failed to unpublish document',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	});
