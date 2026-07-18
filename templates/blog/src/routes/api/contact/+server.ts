import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { siteContext } from '$lib/server/site';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Contact form submission endpoint. Route-independent so the <ContactForm>
 * component (and the `contactForm` page-builder block) can post here from any
 * page without a per-route form action. Submissions land in the
 * `contactSubmission` collection; its `beforeValidate` hooks normalize + stamp.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

	// Honeypot: silently accept so bots don't retry, but store nothing.
	if (String(body.company ?? '').trim() !== '') {
		return json({ success: true });
	}

	// Whitelist accepted fields — never forward raw input into create().
	const values = {
		name: String(body.name ?? '').trim(),
		email: String(body.email ?? '').trim(),
		subject: String(body.subject ?? '').trim(),
		message: String(body.message ?? '').trim()
	};

	const errors: Partial<Record<keyof typeof values, string>> = {};
	if (!values.name) errors.name = 'Please enter your name.';
	if (!values.email) errors.email = 'Please enter your email.';
	else if (!EMAIL_RE.test(values.email)) errors.email = 'Please enter a valid email address.';
	if (!values.message) errors.message = 'Please enter a message.';
	if (Object.keys(errors).length > 0) {
		return json({ success: false, errors, values }, { status: 400 });
	}

	const { context } = await siteContext(locals);
	await locals.aphexCMS.localAPI.collections.contactSubmission.create(context, values);

	return json({ success: true });
};
