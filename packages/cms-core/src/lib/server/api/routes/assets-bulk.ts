import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { cmsLogger } from '../../../utils/logger';
import { bulkDeleteAssetsRequest } from '../../../api/schemas/assets';
import { hasCapability } from '../../../types/capabilities';
import type { AphexEnv } from '../index';

export const assetsBulkRouter: Hono<AphexEnv> = new Hono<AphexEnv>().delete(
	'/bulk',
	zValidator('json', bulkDeleteAssetsRequest, (result, c) => {
		if (!result.success) {
			return c.json(
				{
					success: false,
					error: 'No asset IDs provided',
					issues: result.error.issues
				},
				400
			);
		}
	}),
	async (c) => {
		try {
			const { assetService, databaseAdapter } = c.var.aphexCMS;
			const auth = c.var.auth;

			if (!auth || auth.type === 'partial_session') {
				return c.json({ success: false, error: 'Unauthorized' }, 401);
			}

			if (!hasCapability(auth, 'asset.delete')) {
				return c.json({ success: false, error: 'Forbidden: asset.delete capability required' }, 403);
			}

			const { ids } = c.req.valid('json');

			let referencedIds: string[] = [];
			if (databaseAdapter.countDocumentReferencesForAssets) {
				const counts = await databaseAdapter.countDocumentReferencesForAssets(
					auth.organizationId,
					ids
				);
				referencedIds = ids.filter((id) => (counts[id] || 0) > 0);
			}

			if (referencedIds.length > 0) {
				return c.json(
					{
						success: false,
						error: `Cannot delete ${referencedIds.length} asset${referencedIds.length > 1 ? 's' : ''} because ${referencedIds.length > 1 ? 'they are' : 'it is'} still referenced by documents`,
						referencedIds
					},
					409
				);
			}

			const results = { deleted: 0, failed: 0 };

			for (const id of ids) {
				try {
					const result = await assetService.deleteAsset(auth.organizationId, id);
					if (result) {
						results.deleted++;
					} else {
						results.failed++;
					}
				} catch {
					results.failed++;
				}
			}

			return c.json({ success: true, data: results });
		} catch (error) {
			cmsLogger.error('Bulk delete failed:', error);
			return c.json({ success: false, error: 'Bulk delete failed' }, 500);
		}
	}
);
