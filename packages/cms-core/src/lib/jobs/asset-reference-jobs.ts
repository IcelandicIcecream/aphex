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

/**
 * Bump when indexing semantics change and every org needs one more rebuild.
 *
 * **Anything that changes what `collectAssetReferences` finds is such a change**
 * — a new wrapper shape, a fixed gap, a corrected field path. Forgetting is
 * quiet and confusing: the job already completed under the old key, so the fix
 * ships, nothing re-runs, and the index stays wrong in exactly the way that was
 * just fixed. v3 is the rich-text image shape, which v2 ran without.
 *
 * The idempotency key is the marker for "this org has been backfilled" — a
 * completed job row, which `scheduleJob` returns instead of inserting a
 * duplicate. That makes enqueueing free to attempt on every request and correct
 * to attempt only once, without a flag anywhere that a normal write could set by
 * accident. The previous design inferred it from "does the index have any rows",
 * which the incremental path also satisfies, so the rebuild it was gating never
 * ran a second time and never could.
 */
export const REFERENCE_BACKFILL_VERSION = 4;

export const assetReferencesBackfillKey = (organizationId: string) =>
	`asset-references:backfill:v${REFERENCE_BACKFILL_VERSION}:${organizationId}`;

export const documentReferencesBackfillKey = (organizationId: string) =>
	`references:backfill:v${REFERENCE_BACKFILL_VERSION}:${organizationId}`;

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
 * Idempotent by construction rather than by short-circuit: rows are *replaced*
 * per document, so running it twice converges on the same index, and the
 * at-least-once delivery the queue guarantees costs duplicate work at worst.
 *
 * An earlier version tried to be idempotent by returning early once the org had
 * any rows. That is not idempotence, it is a latch — and because ordinary saves
 * also create rows, it latched shut before the rebuild had ever run.
 */
export function createAssetReferenceJobHandlers(deps: AssetReferenceJobDeps): JobHandlerMap {
	const service = new AssetReferencesService(deps.databaseAdapter);
	return {
		[ASSET_REFERENCES_BACKFILL_JOB]: async ({ job }) => {
			const { documentTypes } = assetReferencesBackfillPayload.parse(job.payload);
			await service.backfill(job.organizationId, documentTypes);
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
			await new ReferencesService(deps.databaseAdapter).backfill(
				job.organizationId,
				deps.schemaTypes
			);
		}
	};
}
