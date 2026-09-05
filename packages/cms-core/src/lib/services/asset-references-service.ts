import type { DatabaseAdapter } from '../db/interfaces/index';
import { collectAssetReferences, collectAssetIdsUnstructured } from '../utils/asset-reference-walk';
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
 * **Written inside the document's own write transaction, and failures throw.**
 *
 * This was best-effort post-commit at first, on the reasoning that a stale index
 * costs a wrong badge while the delete guard — which reads the documents
 * themselves — keeps the destructive path safe. The guard part held. The rest
 * did not: the "Unused" filter *is* the index, so a missed row doesn't produce a
 * cosmetic blemish, it invites an editor to delete an asset that is in use. The
 * only thing standing behind them at that point is the guard, and a feature
 * whose correctness depends on a later safety net catching it is not correct.
 *
 * So the index is now maintained the way `appendEvent` maintains the outbox: in
 * the same transaction as the change that caused it, such that a document cannot
 * be saved without its references being recorded. The cost is real and worth
 * naming — a bug in the walk now fails the editor's save rather than being
 * swallowed — which is why {@link collectAssetReferences} is pure, separately
 * tested, and skips malformed references instead of throwing.
 *
 * The delete guard still reads documents rather than this index. Defence in
 * depth is cheap here, and it is what caught the drift this design replaced.
 */
export class AssetReferencesService {
	constructor(private databaseAdapter: DatabaseAdapter) {}

	/**
	 * Sync the asset-reference rows for a single document. Idempotent — safe to
	 * call repeatedly with the same data.
	 *
	 * Takes the adapter to write through rather than using the injected one, so
	 * the caller can hand it a `withTransaction` handle and have the rows commit
	 * or roll back with the document. Passing the root adapter is still valid —
	 * that's what the backfill does, where there is no document write to join.
	 *
	 * Draft and published data are walked separately and recorded under their own
	 * `plane`, because they answer different questions: an asset used only by an
	 * abandoned draft is a different risk from one on a live page.
	 */
	async syncAssetReferencesFor(
		db: DatabaseAdapter,
		organizationId: string,
		documentId: string,
		documentType: string,
		draftData: unknown,
		publishedData: unknown
	): Promise<void> {
		if (!db.replaceAssetReferences) return;
		const rows = [
			...collectAssetReferences(draftData).map((r) => ({ ...r, plane: 'draft' as const })),
			...collectAssetReferences(publishedData).map((r) => ({ ...r, plane: 'published' as const }))
		];
		await db.replaceAssetReferences(organizationId, documentId, documentType, rows);
	}

	/**
	 * Compare what the walker found against every asset ref reachable in the data,
	 * and report the difference. Returns how many were missed.
	 *
	 * This is the detector the first four index bugs did without. The walker is a
	 * structural allowlist, so it finds references in the shapes it models; the
	 * delete guard is a substring scan, so it finds them in shapes nobody
	 * anticipated. Every gap between the two has surfaced the same way — an asset
	 * reads as unused, an editor selects it, and the delete refuses — which is a
	 * terrible way to learn about it, weeks after the shape was introduced.
	 *
	 * Running it here costs one extra in-memory pass per document during a rebuild
	 * that already walks everything, and never touches the request path. It only
	 * logs: a gap means the *index* is incomplete, which is exactly what the
	 * rebuild cannot fix on its own — the walker has to learn the shape first.
	 */
	private reportWalkerGaps(
		documentId: string,
		documentType: string,
		draftData: unknown,
		publishedData: unknown
	): number {
		let missed = 0;
		for (const [plane, data] of [
			['draft', draftData],
			['published', publishedData]
		] as const) {
			const indexed = new Set(collectAssetReferences(data).map((r) => r.assetId));
			const reachable = collectAssetIdsUnstructured(data);
			const gaps = [...reachable].filter((id) => !indexed.has(id));
			if (gaps.length === 0) continue;

			missed += gaps.length;
			cmsLogger.warn(
				'[AssetReferences]',
				`Walker missed ${gaps.length} reference(s) in ${documentType} ${documentId} (${plane}): ${gaps.join(', ')}`
			);
		}
		return missed;
	}

	/**
	 * One-time rebuild for content that predates the index.
	 *
	 * **Unconditional.** This used to be `backfillIfEmpty`, gated on "does the org
	 * have any rows" — which the *incremental* path also creates. So a single
	 * document save after the index shipped set that flag forever, the rebuild
	 * never ran, and every un-resaved document stayed invisible to the index. The
	 * "Unused" filter then listed assets that were plainly in use. Three separate
	 * gates were keyed on the same wrong question; this one is now keyed on
	 * nothing, and *whether* to run is the caller's business.
	 *
	 * The caller's marker is the job's versioned idempotency key
	 * ({@link ASSET_REFERENCES_BACKFILL_JOB_KEY}): a completed job row is the
	 * record that this org has been rebuilt, and bumping the version is how a
	 * change in indexing semantics forces exactly one more pass. That is a real
	 * marker for a one-time migration, rather than a heuristic that a row's
	 * existence can forge.
	 *
	 * Per-document failures are logged and skipped rather than abandoning the run:
	 * this is a repair pass, and one unparseable document should not deny the
	 * index to the rest of the org. The job's own retry handles a broader failure.
	 */
	async backfill(organizationId: string, documentTypes: string[]): Promise<void> {
		if (!this.databaseAdapter.replaceAssetReferences) return;
		try {
			// Every type actually present, not just the registered ones.
			//
			// Removing a schema type doesn't remove its documents, and those
			// documents keep referencing whatever assets they always did. The delete
			// guard reads documents unfiltered, so an index built from the schema
			// registry disagrees with it on precisely those assets: "Unused" offers
			// them for deletion and the delete then refuses, with the blocking
			// document nowhere to be found in the admin.
			//
			// Walking them is possible here only because `collectAssetReferences`
			// reads raw JSON and needs no schema. The document-to-document index
			// can't do this — its walker is schema-aware — which is why
			// `ReferencesService.backfill` still takes registered schemas.
			const types = this.databaseAdapter.listStoredDocumentTypes
				? [
						...new Set([
							...documentTypes,
							...(await this.databaseAdapter.listStoredDocumentTypes(organizationId))
						])
					]
				: documentTypes;

			cmsLogger.info(
				'[AssetReferences]',
				`Rebuilding asset-reference index for org ${organizationId} over ${types.length} type(s)`
			);

			let indexed = 0;
			let missed = 0;
			for (const type of types) {
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
						try {
							await this.syncAssetReferencesFor(
								this.databaseAdapter,
								organizationId,
								doc.id,
								type,
								doc.draftData,
								doc.publishedData
							);
							indexed++;
							missed += this.reportWalkerGaps(doc.id, type, doc.draftData, doc.publishedData);
						} catch (err) {
							cmsLogger.error('[AssetReferences]', 'Skipping document', doc.id, err);
						}
					}

					if (docs.length < PAGE) break;
				}
			}

			if (missed > 0) {
				cmsLogger.warn(
					'[AssetReferences]',
					`${missed} reference(s) were reachable in the data but not recognised by the walker. ` +
						`Assets referenced only that way will show as unused and then refuse to delete. ` +
						`Add the shape to collectAssetReferences and bump REFERENCE_BACKFILL_VERSION.`
				);
			}

			cmsLogger.info('[AssetReferences]', `Backfill complete — ${indexed} document(s)`);
		} catch (err) {
			// Rethrow. This used to be swallowed, back when the rebuild ran at boot
			// and taking the app down over it would have been worse.
			//
			// As a queued job that is exactly backwards. Swallowing means a failure
			// halfway through — a dropped connection at document 400 of 900 — returns
			// normally, the worker marks the job **completed**, and the versioned
			// idempotency key is spent. The index stays permanently half-built and
			// nothing will ever re-run it: a failure that presents as success, which
			// is the same trap `backfillIfEmpty` set and the hardest kind to notice.
			//
			// Throwing hands it to the queue, which is what the queue is for — retry
			// with backoff, then dead-letter. Individual documents are still caught
			// above, so one unparseable document doesn't abandon the run; this is
			// only for failures that are actually systemic.
			cmsLogger.error('[AssetReferences]', 'Backfill failed — will retry', err);
			throw err;
		}
	}
}
