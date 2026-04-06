// Aphex CMS Document Version API Handlers
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { authToContext } from '../local-api/auth-helpers';
import { cmsLogger } from '../utils/logger';

// GET /api/documents/[id]/versions - List version history
export const GET: RequestHandler = async ({ params, url, locals }) => {
	try {
		const { localAPI, databaseAdapter } = locals.aphexCMS;
		const context = authToContext(locals.auth);
		const { id } = params;

		if (!id) {
			return json({ success: false, error: 'Document ID is required' }, { status: 400 });
		}

		const limit = parseInt(url.searchParams.get('limit') || '25');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		const result = await localAPI.versionService.listVersions(databaseAdapter,
			context.organizationId,
			id,
			{ limit, offset }
		);

		// Resolve user names for createdBy IDs
		const userIds = [...new Set(result.versions.map((v: any) => v.createdBy).filter(Boolean))];
		const userMap = new Map<string, string>();

		if (userIds.length > 0 && locals.aphexCMS.auth) {
			await Promise.all(
				userIds.map(async (userId: string) => {
					// API key actions are stored as "apikey:<id>" — resolve to a friendly label
					if (userId.startsWith('apikey:')) {
						userMap.set(userId, 'API Key');
						return;
					}
					try {
						const user = await locals.aphexCMS.auth!.getUserById(userId);
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

		return json({
			success: true,
			data: versionsWithUsers,
			total: result.total
		});
	} catch (error) {
		cmsLogger.error('Failed to list document versions:', error);
		return json(
			{ success: false, error: 'Failed to list versions' },
			{ status: 500 }
		);
	}
};

// GET /api/documents/[id]/versions/[version] - Get specific version
export const getVersion: RequestHandler = async ({ params, locals }) => {
	try {
		const { localAPI, databaseAdapter } = locals.aphexCMS;
		const context = authToContext(locals.auth);
		const { id, version } = params as Record<string, string>;

		if (!id || !version) {
			return json(
				{ success: false, error: 'Document ID and version number are required' },
				{ status: 400 }
			);
		}

		const versionNumber = parseInt(version);
		if (isNaN(versionNumber)) {
			return json(
				{ success: false, error: 'Version must be a number' },
				{ status: 400 }
			);
		}

		const result = await localAPI.versionService.getVersion(databaseAdapter,
			context.organizationId,
			id,
			versionNumber
		);

		if (!result) {
			return json({ success: false, error: 'Version not found' }, { status: 404 });
		}

		return json({ success: true, data: result });
	} catch (error) {
		cmsLogger.error('Failed to get document version:', error);
		return json(
			{ success: false, error: 'Failed to get version' },
			{ status: 500 }
		);
	}
};

// POST /api/documents/[id]/versions/[version]/restore - Restore version to draft
export const restoreVersion: RequestHandler = async ({ params, locals }) => {
	try {
		const { localAPI, databaseAdapter } = locals.aphexCMS;
		const context = authToContext(locals.auth);
		const { id, version } = params as Record<string, string>;

		if (!id || !version) {
			return json(
				{ success: false, error: 'Document ID and version number are required' },
				{ status: 400 }
			);
		}

		const versionNumber = parseInt(version);
		if (isNaN(versionNumber)) {
			return json(
				{ success: false, error: 'Version must be a number' },
				{ status: 400 }
			);
		}

		const document = await localAPI.versionService.restoreVersion(databaseAdapter,
			context.organizationId,
			id,
			versionNumber,
			context.user?.id
		);

		if (!document) {
			return json({ success: false, error: 'Version not found or restore failed' }, { status: 404 });
		}

		return json({
			success: true,
			data: document,
			message: `Restored to version ${versionNumber}`
		});
	} catch (error) {
		cmsLogger.error('Failed to restore document version:', error);
		return json(
			{ success: false, error: 'Failed to restore version' },
			{ status: 500 }
		);
	}
};
