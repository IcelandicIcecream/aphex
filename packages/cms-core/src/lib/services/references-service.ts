import type { DatabaseAdapter } from '../db/interfaces/index';
import type { SchemaType } from '../types/schemas';
import { collectReferenceIds } from '../utils/reference-walk';
import { cmsLogger } from '../utils/logger';

/**
 * Maintains the back-reference index. After every doc save the collection-API
 * calls into here with the doc's draftData (the freshly-saved version) and
 * its schema; we walk the data via the schema-aware walker, dedupe the
 * resulting ref IDs, and atomically replace the rows for that referencer.
 *
 * **Written inside the document's own write transaction, and failures throw.**
 *
 * Previously logged-and-swallowed, on the grounds that a stale index shouldn't
 * block a save. The trouble is what reads it: the publish and unpublish guards.
 * An under-populated index there doesn't show a wrong badge, it lets a
 * still-referenced document be unpublished — the index says nothing points at
 * it, so nothing stops you. A guard that silently weakens when a write failed is
 * worse than no guard, because it is trusted.
 *
 * Same contract as the sibling {@link AssetReferencesService}, for the same
 * reason, and see its note for the tradeoff being accepted.
 */
export class ReferencesService {
	constructor(private databaseAdapter: DatabaseAdapter) {}

	/**
	 * Sync the back-reference rows for a single document. Idempotent —
	 * safe to call repeatedly with the same data.
	 *
	 * Takes the adapter to write through so the caller can pass a
	 * `withTransaction` handle and have these rows commit with the document.
	 */
	async syncReferencesFor(
		db: DatabaseAdapter,
		organizationId: string,
		documentId: string,
		data: unknown,
		schema: SchemaType | null,
		registry: SchemaType[]
	): Promise<void> {
		const refIds = collectReferenceIds(data, schema, registry);
		await db.replaceReferencesFor(organizationId, documentId, refIds);
	}

	/**
	 * One-time rebuild for content that predates the index. Unconditional — see
	 * {@link AssetReferencesService.backfill} for why the old "is the table empty"
	 * gate was unsound, and what replaced it.
	 */
	async backfill(organizationId: string, schemas: SchemaType[]): Promise<void> {
		try {
			cmsLogger.info('[References]', `Rebuilding reference index for org ${organizationId}`);

			let indexed = 0;
			for (const schema of schemas.filter((candidate) => candidate.type === 'document')) {
				// Paged rather than loaded whole. The caller used to supply a
				// `listAllDocuments()` that materialised an entire content set in
				// memory, which is part of why this was never wired to anything.
				const PAGE = 100;
				for (let offset = 0; ; offset += PAGE) {
					const page = await this.databaseAdapter.findManyDocAdvanced(organizationId, schema.name, {
						limit: PAGE,
						offset
					});
					const docs = page?.docs ?? [];
					if (docs.length === 0) break;

					for (const doc of docs) {
						try {
							// Draft data is what the guards care about: an unpublished draft
							// pointing at a document still blocks that document's deletion.
							const refIds = collectReferenceIds(doc.draftData, schema, schemas);
							await this.databaseAdapter.replaceReferencesFor(organizationId, doc.id, refIds);
							indexed++;
						} catch (err) {
							cmsLogger.error('[References]', 'Skipping document', doc.id, err);
						}
					}

					if (docs.length < PAGE) break;
				}
			}

			cmsLogger.info('[References]', `Backfill complete — ${indexed} document(s)`);
		} catch (err) {
			// Rethrow so the queue retries — see the note on
			// AssetReferencesService.backfill. Swallowing here would mark a
			// half-finished rebuild as completed, and this index feeds the publish
			// and unpublish guards, so an incomplete one doesn't mislabel anything:
			// it lets a still-referenced document through.
			cmsLogger.error('[References]', 'Backfill failed — will retry', err);
			throw err;
		}
	}
}
