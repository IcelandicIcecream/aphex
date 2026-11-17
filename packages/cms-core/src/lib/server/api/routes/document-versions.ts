import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authToContext } from '../../../local-api/auth-helpers';
import { cmsLogger } from '../../../utils/logger';
import { PermissionError } from '../../../local-api/permissions';
import { DocumentValidationError } from '../../../local-api/collection-api';
import { isRevisionConflictError } from '../../../db/interfaces/index';
import { listVersionsQuery, restoreVersionRequest } from '../../../api/schemas/documents';
import type { AphexEnv } from '../index';
import type { LocalAPIContext } from '../../../local-api/types';
import type { LocalAPI } from '../../../local-api/index';

/**
 * The collection a document id belongs to. Every version route goes through
 * it, so a version is read and restored under the document's own permission
 * rules (role, ownership, the organization's features), never just the id.
 */
async function collectionOf(localAPI: LocalAPI, context: LocalAPIContext, id: string) {
	const found = await localAPI.findDocumentById(context, id);
	return found ? localAPI.getCollection(found.type) : undefined;
}

const forbidden = (error: unknown) =>
	error instanceof PermissionError
		? ({ success: false, error: 'Forbidden', message: error.message } as const)
		: null;

export const documentVersionsRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get(
		'/:id/versions',
		zValidator('query', listVersionsQuery, (result, c) => {
			if (!result.success) {
				return c.json(
					{
						success: false,
						error: 'Invalid query parameters',
						issues: result.error.issues
					},
					400
				);
			}
		}),
		async (c) => {
			try {
				const { localAPI } = c.var.aphexCMS;
				const context = authToContext(c.var.auth);
				const id = c.req.param('id');

				if (!id) {
					return c.json({ success: false, error: 'Document ID is required' }, 400);
				}

				const q = c.req.valid('query');
				const limit = q.limit ?? 25;
				const offset = q.offset ?? 0;

				const collection = await collectionOf(localAPI, context, id);
				const result = await collection?.listVersions(context, id, { limit, offset });
				if (!result) return c.json({ success: false, error: 'Document not found' }, 404);

				const userIds = [...new Set(result.versions.map((v: any) => v.createdBy).filter(Boolean))];
				const userMap = new Map<string, string>();

				if (userIds.length > 0 && c.var.aphexCMS.auth) {
					await Promise.all(
						userIds.map(async (userId: string) => {
							if (userId.startsWith('apikey:')) {
								userMap.set(userId, 'API Key');
								return;
							}
							try {
								const user = await c.var.aphexCMS.auth!.getUserById(userId);
								if (user) {
									userMap.set(userId, user.name || user.email);
								}
							} catch {
								// User not found — skip
							}
						})
					);
				}

				const versionsWithUsers = result.versions.map((v: any) => ({
					...v,
					createdByName: v.createdBy ? userMap.get(v.createdBy) || null : null
				}));

				return c.json({
					success: true,
					data: versionsWithUsers,
					total: result.total
				});
			} catch (error) {
				const denied = forbidden(error);
				if (denied) return c.json(denied, 403);
				cmsLogger.error('Failed to list document versions:', error);
				return c.json({ success: false, error: 'Failed to list versions' }, 500);
			}
		}
	)
	.get('/:id/versions/:version', async (c) => {
		try {
			const { localAPI } = c.var.aphexCMS;
			const context = authToContext(c.var.auth);
			const id = c.req.param('id');
			const version = c.req.param('version');

			if (!id || !version) {
				return c.json(
					{ success: false, error: 'Document ID and version number are required' },
					400
				);
			}

			const versionNumber = parseInt(version);
			if (isNaN(versionNumber)) {
				return c.json({ success: false, error: 'Version must be a number' }, 400);
			}

			const collection = await collectionOf(localAPI, context, id);
			const result = await collection?.getVersion(context, id, versionNumber);

			if (!result) {
				return c.json({ success: false, error: 'Version not found' }, 404);
			}

			return c.json({ success: true, data: result });
		} catch (error) {
			const denied = forbidden(error);
			if (denied) return c.json(denied, 403);
			cmsLogger.error('Failed to get document version:', error);
			return c.json({ success: false, error: 'Failed to get version' }, 500);
		}
	})
	.post('/:id/versions/:version/restore', async (c) => {
		try {
			const auth = c.var.auth;
			if (!auth || auth.type === 'partial_session') {
				return c.json({ success: false, error: 'Unauthorized' }, 401);
			}
			const { localAPI } = c.var.aphexCMS;
			const context = authToContext(c.var.auth);
			const id = c.req.param('id');
			const version = c.req.param('version');

			if (!id || !version) {
				return c.json(
					{ success: false, error: 'Document ID and version number are required' },
					400
				);
			}

			const versionNumber = parseInt(version);
			if (isNaN(versionNumber)) {
				return c.json({ success: false, error: 'Version must be a number' }, 400);
			}

			const body = await c.req.json().catch(() => ({}));
			const parsed = restoreVersionRequest.safeParse(body);
			if (!parsed.success) {
				return c.json(
					{ success: false, error: 'Invalid request', issues: parsed.error.issues },
					400
				);
			}

			const collection = await collectionOf(localAPI, context, id);
			const restored = await collection?.restoreVersion(context, id, versionNumber, {
				expectedRevision: parsed.data.expectedRevision
			});

			if (!restored) {
				return c.json({ success: false, error: 'Version not found or restore failed' }, 404);
			}

			return c.json({
				success: true,
				data: restored.document,
				message: `Restored to version ${versionNumber}`
			});
		} catch (error) {
			const denied = forbidden(error);
			if (denied) return c.json(denied, 403);
			if (error instanceof DocumentValidationError) {
				return c.json(
					{ success: false, error: 'Invalid document data', message: error.message },
					400
				);
			}
			cmsLogger.error('Failed to restore document version:', error);
			if (isRevisionConflictError(error)) {
				return c.json(
					{
						success: false,
						error: 'Conflict',
						message: error.message,
						currentRevision: error.currentRevision
					},
					409
				);
			}
			return c.json({ success: false, error: 'Failed to restore version' }, 500);
		}
	});
