import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { authToContext } from '../../../local-api/auth-helpers';
import { cmsLogger } from '../../../utils/logger';
import { hasCapability } from '../../../types/capabilities';
import { RevisionConflictError } from '../../../db/interfaces';
import { listVersionsQuery, restoreVersionRequest } from '../../../api/schemas/documents';
import type { AphexEnv } from '../index';

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
				const { localAPI, databaseAdapter } = c.var.aphexCMS;
				const context = authToContext(c.var.auth);
				const id = c.req.param('id');

				if (!id) {
					return c.json({ success: false, error: 'Document ID is required' }, 400);
				}

				const q = c.req.valid('query');
				const limit = q.limit ?? 25;
				const offset = q.offset ?? 0;

				const result = await localAPI.versionService.listVersions(
					databaseAdapter,
					context.organizationId,
					id,
					{ limit, offset }
				);

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
				cmsLogger.error('Failed to list document versions:', error);
				return c.json({ success: false, error: 'Failed to list versions' }, 500);
			}
		}
	)
	.get('/:id/versions/:version', async (c) => {
		try {
			const { localAPI, databaseAdapter } = c.var.aphexCMS;
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

			const result = await localAPI.versionService.getVersion(
				databaseAdapter,
				context.organizationId,
				id,
				versionNumber
			);

			if (!result) {
				return c.json({ success: false, error: 'Version not found' }, 404);
			}

			return c.json({ success: true, data: result });
		} catch (error) {
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
			if (!hasCapability(auth, 'document.update')) {
				return c.json(
					{ success: false, error: 'Forbidden: document.update capability required' },
					403
				);
			}

			const { localAPI, databaseAdapter } = c.var.aphexCMS;
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

			const document = await localAPI.versionService.restoreVersion(
				databaseAdapter,
				context.organizationId,
				id,
				versionNumber,
				context.user?.id,
				parsed.data.expectedRevision
			);

			if (!document) {
				return c.json({ success: false, error: 'Version not found or restore failed' }, 404);
			}

			return c.json({
				success: true,
				data: document,
				message: `Restored to version ${versionNumber}`
			});
		} catch (error) {
			cmsLogger.error('Failed to restore document version:', error);
			if (error instanceof RevisionConflictError) {
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
