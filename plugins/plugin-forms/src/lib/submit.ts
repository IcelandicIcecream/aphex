import type { Context } from 'hono';
import { z } from 'zod';
import { validateFormData } from '@aphexcms/cms-core';
import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';
import type { AphexEnv } from '@aphexcms/cms-core/server';
import {
	compileForm,
	isInputField,
	type FormDocument,
	type FormFieldValue,
	type NotificationEmailValue
} from './compile';
import { fieldLabels, toStoredValue, type Answer } from './template';
import { formSubmissionCreated } from './events';

/** A stored submission, as this plugin writes and reads it. */
interface FormSubmissionDocument {
	id: string;
	form: { _type: 'reference'; _ref: string };
	summary: string;
	submittedAt: string;
	submissionData: Array<Answer & { _type: 'answer'; _key: string }>;
	notificationEmails: Array<NotificationEmailValue & { _type: string; _key: string }>;
	notificationFieldLabels: Array<{
		_type: string;
		_key: string;
		field: string;
		label: string;
	}>;
}

/**
 * `POST /api/form-submissions` — the one public surface this plugin opens.
 *
 * Everything here treats the request as hostile, because it is: this is the only
 * endpoint in the CMS an anonymous visitor is *meant* to write through.
 *
 *  - The submitted values are validated against the form's own fields, using the
 *    same engine the admin uses (see `compile.ts`). A select can only hold an
 *    option the form offers; an email field must hold an email.
 *  - Only fields the form declares are stored. A key the form doesn't define is
 *    dropped rather than persisted, so a crafted request can't stuff arbitrary
 *    data into a document.
 *  - The submission is written under `systemContext`, which bypasses RBAC — the
 *    visitor has no account. That is safe only because the shape written here is
 *    fully determined by the form document, never by the request.
 *  - No email is sent from this path. A submission is stored and an event is
 *    emitted; the notification runs as a durable job, so a mail outage can't fail
 *    a visitor's submit and a retry can't re-store the submission.
 */

const submitRequest = z.object({
	form: z.string().min(1),
	version: z.string().min(1).max(128),
	/** Field name → submitted value. */
	data: z
		.record(z.string(), z.unknown())
		.refine((data) => Object.keys(data).length <= 50, 'Too many fields'),
	/**
	 * Honeypot. A real visitor never sees this input and so never fills it; a bot
	 * that fills every field it finds does. Named innocuously on purpose.
	 */
	website: z.string().optional()
});

/** Requests per window, per IP. Deliberately generous — this is a floor, not a filter. */
const IP_RATE_LIMIT = 10;
const FORM_RATE_LIMIT = 50;
const RATE_WINDOW_MS = 60_000;
const MAX_REQUEST_BYTES = 64 * 1024;

/**
 * In-memory rate limiting.
 *
 * Per-process and therefore per-instance: behind several replicas the effective
 * limit multiplies, and a restart forgets everything. That is a real limitation
 * and it is the right trade for a starter — it costs nothing, needs no Redis, and
 * stops the naive case. A site under actual attack wants this at the edge (a WAF
 * or the platform's own rate limiting), where a request can be dropped before it
 * reaches an application process at all.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string, limit: number): boolean {
	const now = Date.now();
	const entry = hits.get(key);

	if (!entry || now > entry.resetAt) {
		hits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
		// Opportunistic sweep: without it the map grows for the life of the process,
		// one entry per IP ever seen.
		if (hits.size > 5000) {
			for (const [k, v] of hits) if (now > v.resetAt) hits.delete(k);
		}
		return false;
	}

	entry.count += 1;
	return entry.count > limit;
}

/** Trusted connection address supplied by the framework bridge. */
function clientKey(c: Context<AphexEnv>): string {
	return c.env.clientAddress?.trim() || 'unknown';
}

async function parseRequest(c: Context<AphexEnv>): Promise<z.infer<typeof submitRequest> | null> {
	const contentLength = Number(c.req.header('content-length'));
	if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) return null;
	const body = await c.req.text().catch(() => '');
	if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) return null;
	const json = (() => {
		try {
			return JSON.parse(body) as unknown;
		} catch {
			return null;
		}
	})();
	const parsed = submitRequest.safeParse(json);
	return parsed.success ? parsed.data : null;
}

export async function handleSubmit(c: Context<AphexEnv>): Promise<Response> {
	const { aphexCMS } = c.var;

	const parsed = await parseRequest(c);
	if (!parsed) {
		return c.json({ success: false, error: 'Invalid request' }, 400);
	}
	const { form: formId, version, data, website } = parsed;

	/*
	 * A tripped honeypot returns success. Telling a bot it was detected teaches
	 * whoever wrote it to stop filling that field; a 200 with nothing stored costs
	 * them a submission and no information.
	 */
	if (website && website.trim() !== '') {
		return c.json({ success: true });
	}

	if (
		rateLimited(`ip:${clientKey(c)}`, IP_RATE_LIMIT) ||
		rateLimited(`form:${formId}`, FORM_RATE_LIMIT)
	) {
		return c.json({ success: false, error: 'Too many submissions. Try again shortly.' }, 429);
	}

	const organizationId = await aphexCMS.databaseAdapter.resolvePublishedDocumentOrganizationId(
		formId,
		'form'
	);
	if (!organizationId) return c.json({ success: false, error: 'Form not found' }, 404);
	const context = systemContext(organizationId);

	/*
	 * Collections are reached by name, not through the typed `collections` map:
	 * that map is generated from the *app's* schemas, and a plugin's own
	 * collections aren't in it at compile time. `getCollection` is the accessor
	 * built for exactly this — dynamic access from route handlers.
	 */
	const forms = aphexCMS.localAPI.getCollection<FormDocument>('form');
	const submissions = aphexCMS.localAPI.getCollection<FormSubmissionDocument>('formSubmission');
	if (!forms || !submissions) {
		aphexCMS.logger?.error('[forms] plugin collections are not registered');
		return c.json({ success: false, error: 'Forms are not configured' }, 500);
	}

	// Published only. A form still in draft is not live, and honouring it would let
	// anyone submit against a form the editor hasn't finished.
	const formDoc = await forms
		.findByID(context, formId, { perspective: 'published' })
		.catch(() => null);

	if (!formDoc) return c.json({ success: false, error: 'Form not found' }, 404);
	if (formDoc._meta?.status !== 'published') {
		return c.json({ success: false, error: 'Form not found' }, 404);
	}
	if (!formDoc._meta?.publishedHash || formDoc._meta.publishedHash !== version) {
		return c.json(
			{ success: false, error: 'This form changed. Refresh the page and try again.' },
			409
		);
	}

	const declared = (formDoc.fields ?? []) as FormFieldValue[];
	const inputs = declared.filter(isInputField);

	// Keep only what the form declares — see the note above about stuffing.
	const submitted: Record<string, unknown> = {};
	for (const field of inputs) submitted[field.name as string] = data[field.name as string];

	const definition = compileForm({ ...formDoc, id: formId });
	const shaped = definition.transform ? definition.transform(submitted) : submitted;
	const result = await validateFormData(definition, shaped);

	if (!result.isValid) {
		// Field-keyed so the form can show each message against its own input.
		const errors: Record<string, string> = {};
		for (const entry of result.errors) errors[entry.field] = entry.errors[0] ?? 'Invalid';
		return c.json({ success: false, error: 'Please check the form', errors }, 400);
	}

	const answers: Answer[] = inputs.map((field) => ({
		field: field.name as string,
		value: toStoredValue(result.normalizedData[field.name as string])
	}));

	// A one-line description for the submissions list, so it's readable without
	// opening every row. The first answer with something in it is nearly always
	// the name or the email.
	const labels = fieldLabels(declared);
	const first = answers.find((a) => a.value);
	const summary = first
		? `${labels.get(first.field) ?? first.field}: ${first.value}`
		: 'Submission';

	const submissionId = crypto.randomUUID();
	const notificationEmails = (formDoc.emails ?? [])
		.filter((email) => typeof email.to === 'string' && email.to.trim().length > 0)
		.map((email, index) => ({
			_type: 'submissionNotification',
			_key: `notification-${index}`,
			to: email.to?.trim(),
			replyTo: email.replyTo?.trim() || undefined,
			subject: email.subject ?? 'New form submission',
			message: email.message ?? '{{allFields}}'
		}));
	await submissions.create(
		context,
		{
			form: { _type: 'reference', _ref: formId },
			summary: summary.slice(0, 200),
			submittedAt: new Date().toISOString(),
			submissionData: answers.map((answer, i) => ({
				_type: 'answer',
				_key: `a-${i}`,
				...answer
			})),
			notificationEmails,
			notificationFieldLabels: inputs.map((field, index) => ({
				_type: 'submissionFieldLabel',
				_key: `label-${index}`,
				field: field.name as string,
				label: labels.get(field.name as string) ?? (field.name as string)
			}))
		},
		{
			id: submissionId,
			skipVersioning: true,
			outboxEvents: [
				{
					type: formSubmissionCreated.type,
					payload: formSubmissionCreated.parse({ submissionId, formId })
				}
			]
		}
	);

	return c.json({
		success: true,
		confirmationType: formDoc.confirmationType ?? 'message',
		redirectUrl: formDoc.confirmationType === 'redirect' ? (formDoc.redirectUrl ?? null) : null
	});
}
