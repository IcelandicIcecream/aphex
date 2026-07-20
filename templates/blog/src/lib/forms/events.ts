// The `form.submitted` domain event — the fact a form submission produces. Lean by design:
// identifiers only, never the raw answers (which may hold PII). Consumers that need answer
// values will read the stored submission by id (once durable storage lands in Slice 1).
import { defineEvent } from '@aphexcms/cms-core';
import { z } from 'zod';

export const formSubmitted = defineEvent(
	'form.submitted',
	z.object({
		formId: z.string(),
		submissionId: z.string()
	})
);
