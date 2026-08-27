import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { Asset } from '../../../types/asset';
import { cmsLogger } from '../../../utils/logger';
import { updateAssetRequest } from '../../../api/schemas/assets';
import { hasCapability } from '../../../types/capabilities';
import { clearAssetReferences } from './clear-asset-references';
import type { AphexEnv } from '../index';

export const assetsByIdRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get('/:id', async (c) => {
		try {
			const { assetService } = c.var.aphexCMS;
			const auth = c.var.auth;
			const id = c.req.param('id');

			if (!auth || auth.type === 'partial_session') {
				return c.json({ success: false, error: 'Unauthorized' }, 401);
			}

			if (!hasCapability(auth, 'asset.read')) {
				return c.json({ success: false, error: 'Forbidden: asset.read capability required' }, 403);
			}

			if (!id) {
				return c.json({ success: false, error: 'Asset ID is required' }, 400);
			}

			const asset = await assetService.findAssetById(auth.organizationId, id);
			if (!asset) {
				return c.json({ success: false, error: 'Asset not found' }, 404);
			}

			return c.json({ success: true, data: asset });
		} catch (error) {
			cmsLogger.error('[Asset API] Error fetching asset:', error);
			return c.json({ success: false, error: 'Failed to fetch asset' }, 500);
		}
	})
	.delete('/:id', async (c) => {
		try {
			const id = c.req.param('id');
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

			if (!id) {
				return c.json({ success: false, error: 'Asset ID is required' }, 400);
			}

			// `?force=true` bypasses the reference guard. It is the only escape for a
			// reference held by a document whose schema type is no longer registered:
			// such a document can't be opened in the admin, so the reference can't be
			// removed by hand and the asset would otherwise be undeletable forever.
			const force = c.req.query('force') === 'true';

			if (databaseAdapter.findDocumentsReferencingAsset && !force) {
				// Deliberately scanned WITHOUT `knownTypes`. Type-filtering is correct
				// for *display* (assets-references.ts) but wrong for the delete guard:
				// a document whose type was removed from the codebase still exists in
				// the DB and still holds the reference, so filtering it out lets the
				// delete through and leaves a permanently dangling `_ref` that renders
				// as a silently blank image.
				const refs = await databaseAdapter.findDocumentsReferencingAsset(auth.organizationId, id);

				if (refs.length > 0) {
					const knownTypes = new Set(localAPI.getCollectionNames());
					const orphanRefs = refs.filter((ref) => !knownTypes.has(ref.type));
					const unregisteredTypes = [...new Set(orphanRefs.map((ref) => ref.type))];

					let error = `Cannot delete asset — it is referenced by ${refs.length} document${refs.length > 1 ? 's' : ''}`;
					if (unregisteredTypes.length > 0) {
						// Without this the message is a dead end: the blocking document
						// doesn't appear anywhere in the admin, so "remove the reference
						// first" is impossible advice.
						error +=
							`. ${orphanRefs.length} of ${refs.length > 1 ? 'them use' : 'these uses'} schema type${unregisteredTypes.length > 1 ? 's' : ''} that ${unregisteredTypes.length > 1 ? 'are' : 'is'} no longer registered ` +
							`(${unregisteredTypes.join(', ')}) and cannot be opened in the admin. ` +
							`Re-register the type to edit the document, or delete with force.`;
					}

					return c.json({ success: false, error, references: refs, unregisteredTypes }, 409);
				}
			}

			const result = await assetService.deleteAsset(auth.organizationId, id);
			if (!result) {
				return c.json({ success: false, error: 'Asset not found or could not be deleted' }, 404);
			}

			await clearAssetReferences(databaseAdapter, auth.organizationId, id);

			return c.json({ success: true });
		} catch (error) {
			cmsLogger.error('Error deleting asset:', error);
			return c.json({ success: false, error: 'Failed to delete asset' }, 500);
		}
	})
	.patch(
		'/:id',
		zValidator('json', updateAssetRequest, (result, c) => {
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
		}),
		async (c) => {
			try {
				const { assetService } = c.var.aphexCMS;
				const auth = c.var.auth;
				const id = c.req.param('id');

				if (!auth || auth.type === 'partial_session') {
					return c.json({ success: false, error: 'Unauthorized' }, 401);
				}

				if (!hasCapability(auth, 'asset.upload')) {
					return c.json(
						{ success: false, error: 'Forbidden: asset.upload capability required' },
						403
					);
				}

				if (!id) {
					return c.json({ success: false, error: 'Asset ID is required' }, 400);
				}

				const { title, description, alt, creditLine } = c.req.valid('json');

				let updatedAsset: Asset | null;

				if (auth.type === 'session') {
					updatedAsset = await assetService.updateAssetMetadata(auth.organizationId, id, {
						title,
						description,
						alt,
						creditLine,
						updatedBy: auth.user.id
					});
				} else {
					updatedAsset = await assetService.updateAssetMetadata(auth.organizationId, id, {
						title,
						description,
						alt,
						creditLine,
						updatedBy: auth.keyId
					});
				}

				if (!updatedAsset) {
					return c.json({ success: false, error: 'Asset not found' }, 404);
				}

				return c.json({ success: true, data: updatedAsset });
			} catch (error) {
				cmsLogger.error('Error updating asset:', error);
				return c.json({ success: false, error: 'Failed to update asset' }, 500);
			}
		}
	);
