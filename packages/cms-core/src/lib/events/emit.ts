// Shared emit helpers for built-in domain events. Kept in one place so the event's payload
// shape has a single source of truth and every publish path emits an identical fact — the
// event is a property of *publishing*, not of any one code path that happens to publish.
import type { DatabaseAdapter } from '../db/interfaces/index';
import type { Document } from '../types/document';
import { documentPublished } from './catalog';

/**
 * Emit `document.published` (and its outbox row) for a freshly published document. MUST be
 * called on a TRANSACTION handle (from `withTransaction`) so the event commits atomically with
 * the publish it describes — the transactional-outbox guarantee. Shared by every publish path,
 * versioned and non-versioned alike, so the fact fires whenever a publish happens regardless of
 * whether a version snapshot was taken.
 */
export async function emitDocumentPublished(
	tx: DatabaseAdapter,
	organizationId: string,
	doc: Document
): Promise<void> {
	await tx.appendEvent({
		organizationId,
		type: documentPublished.type,
		payload: documentPublished.parse({
			documentId: doc.id,
			documentType: doc.type,
			publishedHash: doc.publishedHash ?? null
		}),
		createdBy: doc.updatedBy
	});
}
