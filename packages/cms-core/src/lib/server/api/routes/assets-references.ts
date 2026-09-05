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
			const { databaseAdapter } = c.var.aphexCMS;
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

			// Unfiltered, matching the delete guard.
			//
			// This passed `knownTypes`, which hid documents whose schema type is no
			// longer registered — the exact documents that block a delete. So the
			// panel an editor opens to find out *why* an asset won't delete was the
			// one place guaranteed not to show them.
			//
			// The two display surfaces are split by purpose, deliberately: the grid's
			// count comes from the index and agrees with the Unused filter, while this
			// panel answers "what is holding this asset" and so reads the same
			// structure-blind scan the guard does.
			const references = await databaseAdapter.findDocumentsReferencingAsset(
				auth.organizationId,
				id
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

				// Counted from the index, the same rows the `usage` filter reads.
				//
				// This used to call `countDocumentReferencesForAssets` — the document
				// scan — while the Unused filter beside it read the index. Two sources
				// for one question, and they disagreed exactly where the index had a
				// gap: the grid showed "1 reference" on a row the filter had just
				// listed as unused. Whichever was right, a library that contradicts
				// itself on screen is telling the editor not to trust either number.
				//
				// The scan stays where it belongs — the delete guard — precisely
				// because it is structure-blind and over-approximates. Display and
				// safety are allowed to differ; two display surfaces are not.
				if (databaseAdapter.countAssetReferencesForAssets) {
					const counts = await databaseAdapter.countAssetReferencesForAssets(
						auth.organizationId,
						ids
					);
					return c.json({ success: true, data: counts });
				}

				// No index on this adapter — fall back to the scan so the count is
				// still answered, type-filtered as it always was.
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
