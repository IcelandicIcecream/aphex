import type { EventConsumerHandler } from '@aphexcms/cms-core';
import { z } from 'zod';
import { formSubmissionCreated } from './events';
import type { NotificationEmailValue } from './compile';
import { renderTemplate, type Answer } from './template';
import { fromHeader } from './sender';
import type { PrepareFormEmail } from './prepare';

function labelled(answers: Answer[], labels: Map<string, string>) {
	return answers.map(({ field, value }) => ({ field, label: labels.get(field) ?? field, value }));
}

/**
 * Sends a form's notification emails, out of band.
 *
 * This runs as a delivery job, which is the entire reason a mail outage can't
 * fail a visitor's submit: the submission is already stored, and a throw here
 * retries with backoff and eventually dead-letters, visible in Activity. Sending
 * inline in the request would have coupled "did my message go through" to
 * whether an SMTP host answered.
 *
 * At-least-once delivery means this can run twice for one submission. A duplicate
 * notification email is the acceptable failure — the alternative, tracking sent
 * state to make it exactly-once, would have to be written somewhere that itself
 * can fail between the send and the write.
 */
export function notifyOnSubmission(
	from?: string,
	prepare?: PrepareFormEmail
): EventConsumerHandler {
	return async ({ event, databaseAdapter, emailAdapter, logger }) => {
		/*
		 * The sending identity belongs to the app, not to this plugin — it's the same
		 * address the CMS's own password-reset and invitation mail goes out as. Passed
		 * in via `formsPlugin({ from })`, falling back to the variable the templates
		 * already use. Missing configuration throws when this submission has recipients,
		 * making the delivery retry and eventually surface in Activity instead of being
		 * acknowledged without sending.
		 */
		const { submissionId } = formSubmissionCreated.parse(event.payload);

		const submissionRow = await databaseAdapter.findByDocIdAdvanced(
			event.organizationId,
			submissionId
		);
		if (!submissionRow) {
			// The document was deleted between the submit and this delivery. Nothing to
			// send, and nothing that retrying would fix.
			logger.warn(`[forms] submission ${submissionId} is gone; skipping notification`);
			return;
		}

		// A submission is written as a draft and never published, so `draftData` is
		// where both its answers and immutable notification snapshot live.
		const submission = (submissionRow.draftData ?? {}) as {
			submissionData?: Answer[];
			notificationEmails?: NotificationEmailValue[];
			notificationFieldLabels?: Array<{ field?: string; label?: string }>;
			senderName?: string;
		};
		const emails = submission.notificationEmails ?? [];
		if (emails.length === 0) return;
		if (!emailAdapter) throw new Error('[forms] notification email adapter is not configured');
		const sender = from ?? process.env.APHEX_EMAIL_FROM;
		if (!sender) throw new Error('[forms] notification from-address is not configured');

		const answers = (submission.submissionData ?? []).map((a) => ({
			field: String(a.field ?? ''),
			value: String(a.value ?? '')
		}));
		const labels = new Map(
			(submission.notificationFieldLabels ?? []).map((entry) => [
				String(entry.field ?? ''),
				String(entry.label ?? entry.field ?? '')
			])
		);

		for (const [index, email] of emails.entries()) {
			const to = (email.to ?? '')
				.split(',')
				.map((address) => address.trim())
				.filter(Boolean);
			if (to.length === 0) continue;

			const message = {
				from: fromHeader(sender, submission.senderName),
				to,
				replyTo: email.replyTo,
				subject: renderTemplate(email.subject ?? 'New form submission', answers, labels)
					.replace(/[\r\n]+/g, ' ')
					.slice(0, 998),
				text: renderTemplate(email.message ?? '{{allFields}}', answers, labels)
			};
			const prepared = prepare
				? await prepare({
						...message,
						kind: 'notification',
						organizationId: event.organizationId,
						submissionId,
						key: `${submissionId}:notification:${index}`,
						answers: labelled(answers, labels),
						databaseAdapter
					})
				: message;
			if (!prepared || prepared.to.length === 0) continue;
			const result = await emailAdapter.send(prepared);
			if (result.error) throw new Error(`[forms] notification email failed: ${result.error}`);
		}

		logger.info(`[forms] handled ${emails.length} notification(s) for submission ${submissionId}`);
	};
}

/**
 * Sends the visitor their confirmation, when the form has one: the owner's own
 * words, to the address the visitor gave, replies going to the site.
 *
 * Its own consumer, so its delivery retries on its own: a notification to the
 * owner that fails and retries never sends the visitor a second copy.
 */
/** What a stored submission holds for the visitor's confirmation (see submit.ts). */
const storedConfirmation = z.object({
	senderName: z.string().optional(),
	submissionData: z.array(z.object({ field: z.string(), value: z.string() })).optional(),
	notificationFieldLabels: z.array(z.object({ field: z.string(), label: z.string() })).optional(),
	confirmationEmail: z
		.object({
			to: z.string().min(1),
			replyTo: z.string().optional(),
			subject: z.string().min(1),
			message: z.string().min(1)
		})
		.optional()
});

export function confirmSubmission(from?: string, prepare?: PrepareFormEmail): EventConsumerHandler {
	return async ({ event, databaseAdapter, emailAdapter, logger }) => {
		const { submissionId } = formSubmissionCreated.parse(event.payload);
		const row = await databaseAdapter.findByDocIdAdvanced(event.organizationId, submissionId);
		const parsed = storedConfirmation.safeParse(row?.draftData ?? {});
		// Gone, or a submission from before confirmations: nothing to send.
		if (!parsed.success || !parsed.data.confirmationEmail) return;
		const submission = parsed.data;
		const email = parsed.data.confirmationEmail;
		if (!emailAdapter) throw new Error('[forms] confirmation email adapter is not configured');
		const sender = from ?? process.env.APHEX_EMAIL_FROM;
		if (!sender) throw new Error('[forms] confirmation from-address is not configured');

		const message = {
			from: fromHeader(sender, submission.senderName),
			to: email.to,
			replyTo: email.replyTo,
			subject: email.subject.replace(/[\r\n]+/g, ' ').slice(0, 998),
			text: email.message
		};
		const prepared = prepare
			? await prepare({
					...message,
					to: [email.to],
					kind: 'confirmation',
					organizationId: event.organizationId,
					submissionId,
					key: `${submissionId}:confirmation`,
					answers: labelled(
						submission.submissionData ?? [],
						new Map(
							(submission.notificationFieldLabels ?? []).map(({ field, label }) => [field, label])
						)
					),
					databaseAdapter
				})
			: message;
		if (!prepared || prepared.to.length === 0) return;
		const result = await emailAdapter.send(prepared);
		if (result.error) throw new Error(`[forms] confirmation email failed: ${result.error}`);
		logger.info(`[forms] sent the visitor's confirmation for submission ${submissionId}`);
	};
}
