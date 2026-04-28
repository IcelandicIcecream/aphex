import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authToContext } from '../../../local-api/auth-helpers';
import { PermissionError } from '../../../local-api/permissions';
import { SingletonOperationError } from '../../../local-api/collection-api';
import { cmsLogger } from '../../../utils/logger';
import { updateDocumentRequest } from '../../../api/schemas/documents';
import type { AphexEnv } from '../index';

export const documentsByIdRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get('/:id', async (c) => {
		try {
			const { localAPI } = c.var.aphexCMS;
			const context = authToContext(c.var.auth);
			const id = c.req.param('id');

			if (!id) {
				return c.json({ success: false, error: 'Document ID is required' }, 400);
			}

			const depthParam = c.req.query('depth');
			const depth = depthParam ? Math.max(0, Math.min(parseInt(depthParam), 5)) : 0;
			const perspective = (c.req.query('perspective') as 'draft' | 'published') || 'draft';

			const result = await localAPI.findDocumentById(context, id);
			if (!result) {
				return c.json({ success: false, error: 'Document not found' }, 404);
			}

			const collection = localAPI.collections[result.type];
			if (!collection) {
				return c.json(
					{
						success: false,
						error: 'Invalid document type',
						message: `Collection '${result.type}' not found`
					},
					400
				);
			}

			const document = await collection.findByID(context, id, { depth, perspective });
			if (!document) {
				return c.json({ success: false, error: 'Document not found' }, 404);
			}

			return c.json({ success: true, data: document });
		} catch (error) {
			cmsLogger.error('Failed to fetch document:', error);
			if (error instanceof PermissionError) {
				return c.json(
					{ success: false, error: 'Forbidden', message: error.message },
					403
				);
			}
			return c.json(
				{
					success: false,
					error: 'Failed to fetch document',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	})
	.put('/:id', zValidator('json', updateDocumentRequest, (result, c) => {
		if (!result.success) {
			return c.json(
				{
					success: false,
					error: 'Invalid request body',
					issues: result.error.issues
				},
				400
			);
		}
	}), async (c) => {
		try {
			const { localAPI } = c.var.aphexCMS;
			const context = authToContext(c.var.auth);
			const id = c.req.param('id');

			if (!id) {
				return c.json({ success: false, error: 'Document ID is required' }, 400);
			}

			const parsed = c.req.valid('json');
			const documentData = parsed.draftData ?? parsed.data;
			if (!documentData) {
				return c.json({ success: false, error: 'Document data is required' }, 400);
			}
			const shouldPublish = parsed.publish ?? false;

			const found = await localAPI.findDocumentById(context, id);
			if (!found) {
				return c.json({ success: false, error: 'Document not found' }, 404);
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

			const result = await collection.update(context, id, documentData, {
				publish: shouldPublish
			});

			if (!result) {
				return c.json({ success: false, error: 'Document not found' }, 404);
			}

			return c.json({
				success: true,
				data: result.document,
				validation: result.validation
			});
		} catch (error) {
			cmsLogger.error('Failed to update document:', error);
			if (error instanceof PermissionError) {
				return c.json(
					{ success: false, error: 'Forbidden', message: error.message },
					403
				);
			}
			if (error instanceof Error && error.message.includes('validation errors')) {
				return c.json(
					{ success: false, error: 'Validation failed', message: error.message },
					400
				);
			}
			return c.json(
				{
					success: false,
					error: 'Failed to update document',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	})
	.delete('/:id', async (c) => {
		try {
			const { localAPI } = c.var.aphexCMS;
			const context = authToContext(c.var.auth);
			const id = c.req.param('id');

			if (!id) {
				return c.json({ success: false, error: 'Document ID is required' }, 400);
			}

			const result = await localAPI.findDocumentById(context, id);
			if (!result) {
				return c.json({ success: false, error: 'Document not found' }, 404);
			}

			const collection = localAPI.collections[result.type];
			if (!collection) {
				return c.json(
					{
						success: false,
						error: 'Invalid document type',
						message: `Collection '${result.type}' not found`
					},
					400
				);
			}

			const success = await collection.delete(context, id);
			if (!success) {
				return c.json({ success: false, error: 'Document not found' }, 404);
			}

			return c.json({ success: true, message: 'Document deleted successfully' });
		} catch (error) {
			cmsLogger.error('Failed to delete document:', error);
			if (error instanceof PermissionError) {
				return c.json(
					{ success: false, error: 'Forbidden', message: error.message },
					403
				);
			}
			if (error instanceof SingletonOperationError) {
				return c.json(
					{ success: false, error: 'Singleton document', message: error.message },
					400
				);
			}
			return c.json(
				{
					success: false,
					error: 'Failed to delete document',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	});
