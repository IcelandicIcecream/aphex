import { defineEvent } from '@aphexcms/cms-core';
import { z } from 'zod';

/**
 * Emitted once a submission has been stored.
 *
 * Carries identifiers only, in line with the rest of the event catalog: the log
 * is not a content mirror, and a submission is the one payload most likely to
 * hold a person's name, email and message. Keeping those out of the immutable
 * log means a deletion request can be honoured by deleting the submission
 * document — an append-only log that quietly held a second copy would make that
 * impossible.
 *
 * The notification consumer reads the submission back to build the email.
 */
export const formSubmissionCreated = defineEvent(
	'forms.submission.created',
	z.object({
		submissionId: z.string(),
		formId: z.string()
	})
);
