import { z } from 'zod';
import { defineEvent } from './define-event';

// Built-in event catalog. The payload carries identifiers + intentional metadata only —
// never secrets or full document copies (the log is not a content mirror). `organizationId`
// and `createdBy` are columns on the row, so they're not repeated in the payload.

/** Emitted after a document's draft is copied to published, inside the publish transaction. */
export const documentPublished = defineEvent(
	'document.published',
	z.object({
		documentId: z.string(),
		documentType: z.string(),
		publishedHash: z.string().nullable()
	})
);
