import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { cmsLogger } from '../../../utils/logger';
import { bulkDeleteAssetsRequest } from '../../../api/schemas/assets';
import { hasCapability } from '../../../types/capabilities';
import { clearAssetReferences } from './clear-asset-references';
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
			const { assetService, databaseAdapter, localAPI } = c.var.aphexCMS;
			const auth = c.var.auth;

			if (!auth || auth.type === 'partial_session') {
				return c.json({ success: false, error: 'Unauthorized' }, 401);
			}

			if (!hasCapability(auth, 'asset.delete')) {
				return c.json(
					{ success: false, error: 'Forbidden: asset.delete capability required' },
					403
				);
			}

			const { ids } = c.req.valid('json');

			const force = c.req.query('force') === 'true';

			// Scanned WITHOUT `knownTypes`, like the single-asset guard: a document
			// whose schema type was removed from the codebase still exists in the DB
			// and still holds the reference, so filtering it out would let the delete
			// through and leave a dangling `_ref` that renders as a blank image.
			let referencedIds: string[] = [];
			let unregisteredTypes: string[] = [];
			if (databaseAdapter.countDocumentReferencesForAssets && !force) {
				const counts = await databaseAdapter.countDocumentReferencesForAssets(
					auth.organizationId,
					ids
				);
				referencedIds = ids.filter((id) => (counts[id] || 0) > 0);

				// Which of those blockers are documents nobody can open?
				//
				// Without this the message is a dead end — the same dead end the
				// single-asset path already fixed and this one didn't inherit. An
				// editor told "still referenced by documents" goes looking for the
				// document, finds nothing in the admin because its type is gone, and
				// has no way to proceed. Naming the orphaned types, and honouring
				// `force`, is the difference between a refusal and a trap.
				if (referencedIds.length > 0 && databaseAdapter.findDocumentsReferencingAsset) {
					const known = new Set(localAPI.getCollectionNames());
					const types = new Set<string>();
					for (const id of referencedIds) {
						const refs = await databaseAdapter.findDocumentsReferencingAsset(
							auth.organizationId,
							id
						);
						for (const ref of refs) if (!known.has(ref.type)) types.add(ref.type);
					}
					unregisteredTypes = [...types];
				}
			}

			if (referencedIds.length > 0) {
				let error = `Cannot delete ${referencedIds.length} asset${referencedIds.length > 1 ? 's' : ''} because ${referencedIds.length > 1 ? 'they are' : 'it is'} still referenced by documents`;
				if (unregisteredTypes.length > 0) {
					error += `. Some are used by documents of type ${unregisteredTypes.join(', ')}, which no longer ${unregisteredTypes.length > 1 ? 'exist' : 'exists'} in the schema — delete with force to remove those references.`;
				}

				return c.json({ success: false, error, referencedIds, unregisteredTypes }, 409);
			}

			const results = { deleted: 0, failed: 0 };

			for (const id of ids) {
				try {
					const result = await assetService.deleteAsset(auth.organizationId, id);
					if (result) {
						results.deleted++;
						// Bulk delete used to skip this, so a batch left every
						// reference behind while an identical single delete cleaned up.
						await clearAssetReferences(databaseAdapter, auth.organizationId, id);
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
