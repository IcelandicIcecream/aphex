// Built-in job for rebuilding the asset-reference index.
//
// The index is maintained incrementally as documents are saved, so it only needs a
// bulk pass once: for content that predates the index. That pass walks every
// document in the organization, which is exactly the shape of work that must not
// happen inside an HTTP request — it was briefly wired that way, and on a 50k
// document set the first editor to open the "Unused" filter would have worn the
// entire walk before their page rendered.
import { z } from 'zod';
import type { DatabaseAdapter } from '../db/interfaces/index';
import type { SchemaType } from '../types/schemas';
import { ReferencesService } from '../services/references-service';
import { AssetReferencesService } from '../services/asset-references-service';
import type { JobHandlerMap } from './types';

/** Reserved built-in job type. */
export const ASSET_REFERENCES_BACKFILL_JOB = 'asset-references.backfill';

/** Reserved built-in job type for the document-to-document reference index. */
export const DOCUMENT_REFERENCES_BACKFILL_JOB = 'references.backfill';

/** Identifiers only — the handler re-reads content itself, as every job should. */
export const assetReferencesBackfillPayload = z.object({
	documentTypes: z.array(z.string())
});

export interface AssetReferenceJobDeps {
	databaseAdapter: DatabaseAdapter;
	schemaTypes: SchemaType[];
}

/**
 * Handler for the one-time index rebuild.
 *
 * Idempotent in the way that matters: `backfillIfEmpty` short-circuits once the
 * organization has any rows, so the at-least-once delivery the queue guarantees
 * cannot produce duplicate work, and a retry after a partial run resumes rather
 * than starting over. Rows are replaced per document, so even a full re-run
 * converges on the same index.
 */
export function createAssetReferenceJobHandlers(deps: AssetReferenceJobDeps): JobHandlerMap {
	const service = new AssetReferencesService(deps.databaseAdapter);
	return {
		[ASSET_REFERENCES_BACKFILL_JOB]: async ({ job }) => {
			const { documentTypes } = assetReferencesBackfillPayload.parse(job.payload);
			await service.backfillIfEmpty(job.organizationId, documentTypes);
		},

		/**
		 * The document-to-document index, same shape and for the same reason.
		 *
		 * This one had a `backfillIfEmpty` that nothing ever called, so content
		 * predating the index has no rows — and back-references are what the
		 * publish/unpublish guards read. An under-populated index there doesn't
		 * mislabel a badge, it lets a still-referenced document through a guard.
		 *
		 * Schemas come from the engine rather than the payload: they are code, and
		 * a job that outlived a schema rename should use today's list, not the one
		 * that existed when it was enqueued.
		 */
		[DOCUMENT_REFERENCES_BACKFILL_JOB]: async ({ job }) => {
			await new ReferencesService(deps.databaseAdapter).backfillIfEmpty(
				job.organizationId,
				deps.schemaTypes
			);
		}
	};
}
