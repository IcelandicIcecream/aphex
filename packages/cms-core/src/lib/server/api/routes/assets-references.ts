import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { cmsLogger } from '../../../utils/logger';
import { assetReferenceCountsRequest } from '../../../api/schemas/assets';
import { hasCapability } from '../../../types/capabilities';
import type { AphexEnv } from '../index';

/**
 * Asset references endpoints. Two distinct paths sharing one router file:
 *   - GET  /:id/references          → docs that reference one asset
 *   - POST /references/counts       → batch reference counts for many ids
 *
 * Mounted under `/assets`, so the wire paths are
 * `/api/assets/:id/references` and `/api/assets/references/counts`.
 *
 * Order matters in createAphexApi(): mount this BEFORE assetsByIdRouter so
 * `/references/counts` doesn't get captured as `:id = "references"`.
 */
export const assetsReferencesRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get('/:id/references', async (c) => {
		try {
			const { databaseAdapter, localAPI } = c.var.aphexCMS;
			const auth = c.var.auth;

			if (!auth || auth.type === 'partial_session') {
				return c.json({ success: false, error: 'Unauthorized' }, 401);
			}

			if (!hasCapability(auth, 'asset.read')) {
				return c.json({ success: false, error: 'Forbidden: asset.read capability required' }, 403);
			}

			const id = c.req.param('id');
			if (!id) {
				return c.json({ success: false, error: 'Asset ID is required' }, 400);
			}

			if (!databaseAdapter.findDocumentsReferencingAsset) {
				return c.json({ success: true, data: { references: [], total: 0 } });
			}

			const knownTypes = localAPI.getCollectionNames();
			const references = await databaseAdapter.findDocumentsReferencingAsset(
				auth.organizationId,
				id,
				knownTypes
			);

			// Annotate with where in each document the asset sits, from the index.
			// The authoritative list above still comes from reading the documents —
			// this only adds a label, so a stale or missing index costs "Hero image"
			// and never a wrong answer about whether the asset is referenced.
			let annotated = references;
			try {
				const paths = await databaseAdapter.findAssetReferenceFieldPaths?.(auth.organizationId, id);
				if (paths?.length) {
					const byDocument = new Map<string, string[]>();
					for (const row of paths) {
						const existing = byDocument.get(row.documentId) ?? [];
						if (!existing.includes(row.fieldPath)) existing.push(row.fieldPath);
						byDocument.set(row.documentId, existing);
					}
					annotated = references.map((reference) => ({
						...reference,
						fieldPaths: byDocument.get(reference.documentId) ?? []
					}));
				}
			} catch (err) {
				cmsLogger.debug('[Assets]', 'Could not annotate references with field paths:', err);
			}

			return c.json({
				success: true,
				data: {
					references: annotated,
					total: annotated.length
				}
			});
		} catch (error) {
			cmsLogger.error('Failed to find asset references:', error);
			return c.json({ success: false, error: 'Failed to find asset references' }, 500);
		}
	})
	.post(
		'/references/counts',
		zValidator('json', assetReferenceCountsRequest, (result, c) => {
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
				const { databaseAdapter, localAPI } = c.var.aphexCMS;
				const auth = c.var.auth;

				if (!auth || auth.type === 'partial_session') {
					return c.json({ success: false, error: 'Unauthorized' }, 401);
				}

				if (!hasCapability(auth, 'asset.read')) {
					return c.json(
						{ success: false, error: 'Forbidden: asset.read capability required' },
						403
					);
				}

				const { ids } = c.req.valid('json');

				if (ids.length === 0) {
					return c.json({ success: true, data: {} });
				}

				if (!databaseAdapter.countDocumentReferencesForAssets) {
					const counts: Record<string, number> = {};
					for (const id of ids) counts[id] = 0;
					return c.json({ success: true, data: counts });
				}

				const knownTypes = localAPI.getCollectionNames();
				const counts = await databaseAdapter.countDocumentReferencesForAssets(
					auth.organizationId,
					ids,
					knownTypes
				);

				return c.json({ success: true, data: counts });
			} catch (error) {
				cmsLogger.error('Failed to count asset references:', error);
				return c.json({ success: false, error: 'Failed to count asset references' }, 500);
			}
		}
	);
