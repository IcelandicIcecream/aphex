import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { siteContext } from '$lib/server/site';
import { getForm } from '$lib/forms/contact-form';
import { submitForm } from '$lib/forms/submit';

/**
 * Contact form submission endpoint — the SvelteKit-native "endpoint transport" for the new
 * forms core. The <ContactForm> component and the `contactForm` page-builder block POST here.
 *
 * This is where the page builder meets the forms system: the block owns placement + copy
 * (heading/blurb), while the code-defined `defineForm` owns the fields, validation, storage
 * (`cms_form_submissions`), and the `form.submitted` event. This route is the glue — it
 * validates against the form's own fields via `submitForm`, so there's no hand-rolled
 * validation to drift, and every submission fires the event that consumers react to.
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

	// Honeypot: silently accept so bots don't retry, but persist nothing / emit nothing.
	if (String(body.company ?? '').trim() !== '') {
		return json({ success: true });
	}

	// The block may target any code-defined form by id; default to the contact form.
	const formId = String(body.formId ?? 'contact');
	const form = getForm(formId);
	if (!form) return json({ success: false, error: 'Unknown form' }, { status: 404 });

	// Whitelist to the form's own fields — never forward raw input (honeypot, extras) into the
	// stored submission. Deriving the keys from `form.fields` keeps this generic across forms.
	const values = Object.fromEntries(form.fields.map((f) => [f.name, body[f.name]])) as Record<
		string,
		unknown
	>;

	const { orgId } = await siteContext(locals);
	const result = await submitForm(
		{
			organizationId: orgId,
			databaseAdapter: locals.aphexCMS.databaseAdapter,
			logger: locals.aphexCMS.logger
		},
		form,
		values
	);

	if (result.ok) {
		return json({ success: true, submissionId: result.submissionId });
	}

	// Map the forms core's field-keyed error arrays → the flat { field: message } shape the
	// <ContactForm> component renders (first message per field).
	const errors: Record<string, string> = {};
	for (const { field, errors: fieldErrors } of result.errors) {
		if (fieldErrors[0]) errors[field] = fieldErrors[0];
	}
	return json({ success: false, errors }, { status: 400 });
};
