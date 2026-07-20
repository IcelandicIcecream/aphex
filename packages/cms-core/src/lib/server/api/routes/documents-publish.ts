import { Hono } from 'hono';
import { authToContext } from '../../../local-api/auth-helpers';
import { PermissionError } from '../../../local-api/permissions';
import { cmsLogger } from '../../../utils/logger';
import { scheduleDocumentRequest } from '../../../api/schemas/documents';
import type { AphexEnv } from '../index';

export const documentsPublishRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.post('/:id/schedule', async (c) => {
		try {
			const { localAPI } = c.var.aphexCMS;
			const context = authToContext(c.var.auth);
			const id = c.req.param('id');
			if (!id) {
				return c.json({ success: false, error: 'Missing document ID' }, 400);
			}

			const parsed = scheduleDocumentRequest.safeParse(await c.req.json().catch(() => null));
			if (!parsed.success) {
				return c.json(
					{ success: false, error: 'Invalid request', issues: parsed.error.issues },
					400
				);
			}
			const { action, runAt } = parsed.data;

			const found = await localAPI.findDocumentById(context, id);
			if (!found) {
				return c.json({ success: false, error: 'Document not found' }, 404);
			}
			const collection = localAPI.getCollection(found.type);
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

			const when = new Date(runAt);
			const job =
				action === 'publish'
					? await collection.schedulePublish(context, id, when)
					: await collection.scheduleUnpublish(context, id, when);

			return c.json({
				success: true,
				data: { jobId: job.id, type: job.type, runAt: job.runAt.toISOString(), status: job.status },
				message: `Document ${action} scheduled for ${job.runAt.toISOString()}`
			});
		} catch (error) {
			cmsLogger.error('Failed to schedule document action:', error);
			if (error instanceof PermissionError) {
				return c.json({ success: false, error: 'Forbidden', message: error.message }, 403);
			}
			return c.json(
				{
					success: false,
					error: 'Failed to schedule document action',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	})
	.get('/:id/schedule', async (c) => {
		// Pending scheduled publish/unpublish for this document — powers the editor's
		// "scheduled for …" indicator. Read-gated inside the collection.
		try {
			const { localAPI } = c.var.aphexCMS;
			const context = authToContext(c.var.auth);
			const id = c.req.param('id');
			if (!id) return c.json({ success: false, error: 'Missing document ID' }, 400);

			const found = await localAPI.findDocumentById(context, id);
			if (!found) return c.json({ success: false, error: 'Document not found' }, 404);
			const collection = localAPI.getCollection(found.type);
			if (!collection) {
				return c.json({ success: false, error: 'Invalid document type' }, 400);
			}

			const jobs = await collection.getScheduled(context, id);
			return c.json({
				success: true,
				data: jobs.map((j) => ({
					jobId: j.id,
					type: j.type,
					runAt: j.runAt.toISOString(),
					status: j.status,
					createdAt: j.createdAt.toISOString()
				}))
			});
		} catch (error) {
			cmsLogger.error('Failed to read document schedule:', error);
			if (error instanceof PermissionError) {
				return c.json({ success: false, error: 'Forbidden', message: error.message }, 403);
			}
			return c.json({ success: false, error: 'Failed to read document schedule' }, 500);
		}
	})
	.delete('/:id/schedule', async (c) => {
		// Cancel the pending schedule for this document.
		try {
			const { localAPI } = c.var.aphexCMS;
			const context = authToContext(c.var.auth);
			const id = c.req.param('id');
			if (!id) return c.json({ success: false, error: 'Missing document ID' }, 400);

			const found = await localAPI.findDocumentById(context, id);
			if (!found) return c.json({ success: false, error: 'Document not found' }, 404);
			const collection = localAPI.getCollection(found.type);
			if (!collection) {
				return c.json({ success: false, error: 'Invalid document type' }, 400);
			}

			const cancelled = await collection.cancelScheduled(context, id);
			return c.json({ success: true, data: { cancelled } });
		} catch (error) {
			cmsLogger.error('Failed to cancel document schedule:', error);
			if (error instanceof PermissionError) {
				return c.json({ success: false, error: 'Forbidden', message: error.message }, 403);
			}
			return c.json({ success: false, error: 'Failed to cancel document schedule' }, 500);
		}
	})
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

			const collection = localAPI.getCollection(found.type);
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
				return c.json({ success: false, error: 'Forbidden', message: error.message }, 403);
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

			const collection = localAPI.getCollection(found.type);
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
				return c.json({ success: false, error: 'Forbidden', message: error.message }, 403);
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
