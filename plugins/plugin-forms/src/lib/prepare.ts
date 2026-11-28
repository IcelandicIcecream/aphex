import type { DatabaseAdapter, SendEmailOptions } from '@aphexcms/cms-core/server';

/** One form email, about to be sent. */
export interface OutgoingFormEmail {
	/** Who hears about the message, or the visitor's own copy. */
	kind: 'notification' | 'confirmation';
	organizationId: string;
	submissionId: string;
	/** The same for every attempt at this email, so a retry isn't counted twice. */
	key: string;
	from: string;
	to: string[];
	replyTo?: string;
	subject: string;
	text: string;
	html?: string;
	/** The visitor's answers with the questions they answer. From the public: escape them. */
	answers: Array<{ field: string; label: string; value: string }>;
	databaseAdapter: DatabaseAdapter;
}

/** What to send, in place of what was given. */
export type PreparedFormEmail = Pick<
	SendEmailOptions,
	'from' | 'replyTo' | 'subject' | 'text' | 'html'
> & {
	to: string[];
};

/**
 * The app's last word on each form email: who may get it, what it says and how it
 * looks. `null`, or nobody left in `to`, sends nothing; the message stays stored
 * either way. Throw to try again later.
 */
export type PrepareFormEmail = (
	email: OutgoingFormEmail
) => PreparedFormEmail | null | Promise<PreparedFormEmail | null>;
