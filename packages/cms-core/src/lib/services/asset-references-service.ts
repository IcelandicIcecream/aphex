import type { DatabaseAdapter } from '../db/interfaces/index';
import { collectAssetReferences } from '../utils/asset-reference-walk';
import { cmsLogger } from '../utils/logger';

/**
 * Maintains the asset-reference index — which documents use which assets.
 *
 * The sibling of {@link ReferencesService}, which does the same for
 * document-to-document references, and deliberately the same shape: the
 * collection API calls in after a save, the walk is replayed, and the rows for
 * that document are replaced atomically.
 *
 * It exists because "where is this asset used?" was answered by
 * `WHERE published_data::text LIKE '%<assetId>%'` — a full scan casting every
 * document's JSON to text, which no index can serve. Tolerable for one asset,
 * impossible as a filter: "show me unused assets" became assets × documents.
 *
 * **Failures are logged, never thrown.** A stale index is a wrong badge or a
 * wrong filter result, self-healed by the next edit to that document or by the
 * boot-time backfill. Deleting an asset does not consult this index — that guard
 * reads the documents themselves — so drift can never destroy a referenced
 * asset. Keeping the destructive path on the authoritative source is what makes
 * best-effort indexing safe.
 */
export class AssetReferencesService {
	constructor(private databaseAdapter: DatabaseAdapter) {}

	/**
	 * Sync the asset-reference rows for a single document. Idempotent — safe to
	 * call repeatedly with the same data.
	 *
	 * Draft and published data are walked separately and recorded under their own
	 * `plane`, because they answer different questions: an asset used only by an
	 * abandoned draft is a different risk from one on a live page.
	 */
	async syncAssetReferencesFor(
		organizationId: string,
		documentId: string,
		documentType: string,
		draftData: unknown,
		publishedData: unknown
	): Promise<void> {
		if (!this.databaseAdapter.replaceAssetReferences) return;
		try {
			const rows = [
				...collectAssetReferences(draftData).map((r) => ({ ...r, plane: 'draft' as const })),
				...collectAssetReferences(publishedData).map((r) => ({ ...r, plane: 'published' as const }))
			];
			await this.databaseAdapter.replaceAssetReferences(
				organizationId,
				documentId,
				documentType,
				rows
			);
		} catch (err) {
			cmsLogger.error('[AssetReferences]', 'Failed to sync for', documentId, err);
		}
	}

	/**
	 * Boot-time backfill — if the index is empty for an org, rebuild it from every
	 * document. Idempotent and cheap once populated (the empty check
	 * short-circuits).
	 *
	 * This is also what makes best-effort syncing tenable: a save that failed to
	 * index is repaired on the next edit, and everything else is repaired here.
	 *
	 * Skipped silently on error — boot must continue even if the scan can't run.
	 */
	async backfillIfEmpty(organizationId: string, documentTypes: string[]): Promise<void> {
		if (!this.databaseAdapter.replaceAssetReferences) return;
		try {
			if (await this.databaseAdapter.hasAnyAssetReferences?.(organizationId)) return;

			cmsLogger.info(
				'[AssetReferences]',
				`Backfilling asset-reference index for org ${organizationId}`
			);

			let indexed = 0;
			for (const type of documentTypes) {
				// Paged rather than loaded whole: this runs over an entire content set,
				// and the point of the index is to stop asset questions costing one.
				const PAGE = 100;
				for (let offset = 0; ; offset += PAGE) {
					const page = await this.databaseAdapter.findManyDocAdvanced(organizationId, type, {
						limit: PAGE,
						offset
					});
					const docs = page?.docs ?? [];
					if (docs.length === 0) break;

					for (const doc of docs) {
						await this.syncAssetReferencesFor(
							organizationId,
							doc.id,
							type,
							doc.draftData,
							doc.publishedData
						);
						indexed++;
					}

					if (docs.length < PAGE) break;
				}
			}

			cmsLogger.info('[AssetReferences]', `Backfill complete — ${indexed} document(s)`);
		} catch (err) {
			cmsLogger.error('[AssetReferences]', 'Backfill failed (continuing without index)', err);
		}
	}
}
