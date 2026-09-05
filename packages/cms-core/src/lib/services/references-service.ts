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
 * Failures are logged but never thrown — a stale ref index is bad UX (the
 * publish/unpublish guards may be wrong), but it shouldn't block the user's
 * save. The boot-time backfill catches up gaps when the studio restarts.
 */
export class ReferencesService {
	constructor(private databaseAdapter: DatabaseAdapter) {}

	/**
	 * Sync the back-reference rows for a single document. Idempotent —
	 * safe to call repeatedly with the same data.
	 */
	async syncReferencesFor(
		organizationId: string,
		documentId: string,
		data: unknown,
		schema: SchemaType | null,
		registry: SchemaType[]
	): Promise<void> {
		try {
			const refIds = collectReferenceIds(data, schema, registry);
			await this.databaseAdapter.replaceReferencesFor(organizationId, documentId, refIds);
		} catch (err) {
			cmsLogger.error('[References]', 'Failed to sync references for', documentId, err);
		}
	}

	/**
	 * Boot-time backfill — if the references table is empty for an org,
	 * scan every document and rebuild the index. Idempotent and cheap when
	 * the index already has rows (the empty check short-circuits).
	 *
	 * Skipped silently in error paths — boot must keep going even if the
	 * scan can't run (missing perms, connection issues, etc).
	 */
	async backfillIfEmpty(organizationId: string, schemas: SchemaType[]): Promise<void> {
		try {
			const populated = await this.databaseAdapter.hasAnyReferences(organizationId);
			if (populated) return;

			cmsLogger.info('[References]', `Backfilling reference index for org ${organizationId}`);

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
						// Draft data is what the guards care about: an unpublished draft
						// pointing at a document still blocks that document's deletion.
						const refIds = collectReferenceIds(doc.draftData, schema, schemas);
						await this.databaseAdapter.replaceReferencesFor(organizationId, doc.id, refIds);
						indexed++;
					}

					if (docs.length < PAGE) break;
				}
			}

			cmsLogger.info('[References]', `Backfill complete — ${indexed} document(s)`);
		} catch (err) {
			cmsLogger.error('[References]', 'Backfill failed (continuing without index)', err);
		}
	}
}
