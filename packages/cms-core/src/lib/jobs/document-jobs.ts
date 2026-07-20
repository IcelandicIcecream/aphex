// Built-in job types for the scheduled document workflow: publish / unpublish at a
// future `runAt`. The handlers are provided by core but DI'd with the request-scoped
// LocalAPI at the worker endpoint (the runner itself only knows the database adapter).
import { z } from 'zod';
import type { LocalAPI } from '../local-api/index';
import { systemContext } from '../local-api/auth-helpers';
import type { JobHandlerMap } from './types';

/** Reserved built-in job types. Scheduling uses these; the worker maps them to the handlers below. */
export const DOCUMENT_PUBLISH_JOB = 'document.publish';
export const DOCUMENT_UNPUBLISH_JOB = 'document.unpublish';

/** Payload for document.publish / document.unpublish jobs — identifiers only, never content. */
export const documentJobPayload = z.object({
	documentId: z.string(),
	documentType: z.string()
});
export type DocumentJobPayload = z.infer<typeof documentJobPayload>;

export interface DocumentJobDeps {
	localAPI: LocalAPI;
}

/**
 * Built-in handlers for scheduled publish/unpublish.
 *
 * Runs as the system (override access) — the permission check already happened when the
 * job was scheduled. Publish routes through `CollectionAPI.publish`, so it re-runs
 * validation + reference guards + cache invalidation and emits `document.published`
 * inside the publish transaction, exactly like a manual publish. A handler throw is a
 * job failure: the runner retries with backoff or dead-letters it (e.g. a doc whose
 * references became unpublished before the scheduled time fails validation and retries).
 */
export function createDocumentJobHandlers(deps: DocumentJobDeps): JobHandlerMap {
	const { localAPI } = deps;
	return {
		[DOCUMENT_PUBLISH_JOB]: async ({ job }) => {
			const { documentId, documentType } = documentJobPayload.parse(job.payload);
			const collection = localAPI.getCollection(documentType);
			if (!collection) throw new Error(`Unknown collection "${documentType}" for job ${job.id}`);
			await collection.publish(systemContext(job.organizationId), documentId);
		},
		[DOCUMENT_UNPUBLISH_JOB]: async ({ job }) => {
			const { documentId, documentType } = documentJobPayload.parse(job.payload);
			const collection = localAPI.getCollection(documentType);
			if (!collection) throw new Error(`Unknown collection "${documentType}" for job ${job.id}`);
			await collection.unpublish(systemContext(job.organizationId), documentId);
		}
	};
}
