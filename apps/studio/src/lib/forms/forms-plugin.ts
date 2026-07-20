// Forms demo plugin (Slice 0) — the runnable battle-test of the event core.
//
// It composes two parts that together exercise the whole spine:
//   - `aphex/server/route`   → the `endpoint` transport: POST /api/forms/:id/submissions
//   - `aphex/event/consumer` → the reaction to `form.submitted`
//
// Submit a form → validate → emit `form.submitted` → relay → delivery job → this consumer.
// Everything here is client-safe (no server-only imports; the DB is handed in via
// `c.var.aphexCMS`), so it's fine in the shared plugins registry.
import { definePlugin } from '@aphexcms/cms-core';
import { Inbox } from '@lucide/svelte';
import { EMAIL_FROM } from '$lib/email-sender';
import { getForm } from './contact-form';
import { submitForm } from './submit';
import { formSubmitted } from './events';
import FormsTool from './FormsTool.svelte';

export const formsPlugin = definePlugin({
	name: 'forms-demo',
	parts: [
		{
			implements: 'aphex/server/route',
			id: 'forms.submit',
			method: 'POST',
			path: '/forms/:id/submissions',
			// Public: a form is filled out by anonymous visitors. The handler validates input;
			// anti-abuse (rate limit, honeypot) lands with the real endpoint in Slice 1.
			requiredCapabilities: 'public',
			handler: async (c) => {
				const id = c.req.param('id');
				const form = id ? getForm(id) : undefined;
				if (!form) return c.json({ ok: false, error: 'Unknown form' }, 404);

				const rawData = await c.req.json().catch(() => ({}));

				// Slice-0 org resolution: single-org dev convenience. A real endpoint derives the
				// org from the site/host; a submission is never tied to a logged-in user.
				const orgs = await c.var.aphexCMS.databaseAdapter.findAllOrganizations();
				const organizationId = orgs[0]?.id;
				if (!organizationId) return c.json({ ok: false, error: 'No organization' }, 500);

				const result = await submitForm(
					{
						organizationId,
						databaseAdapter: c.var.aphexCMS.databaseAdapter,
						logger: c.var.aphexCMS.logger
					},
					form,
					rawData
				);
				return c.json(result, result.ok ? 200 : 400);
			}
		},
		{
			// The read side of the endpoint transport: list a form's stored submissions. Submissions
			// hold PII (names, emails, messages), so this is gated on `org.settings` — a capability
			// only admin/owner carry, NOT the editor/viewer read floor (`document.read`). That keeps
			// content editors out of the inbox with zero migration. The cleaner long-term move is a
			// dedicated `forms.submissions.read` capability via an `aphex/capabilities` part, granted
			// to whichever roles you choose in the roles UI. Server-only DB access lives INSIDE the
			// handler (via `c.var.aphexCMS`), so the plugin module stays client-safe.
			implements: 'aphex/server/route',
			id: 'forms.list-submissions',
			method: 'GET',
			path: '/forms/:id/submissions',
			requiredCapabilities: ['org.settings'],
			handler: async (c) => {
				const id = c.req.param('id');
				const form = id ? getForm(id) : undefined;
				if (!form) return c.json({ success: false, error: 'Unknown form' }, 404);

				const orgs = await c.var.aphexCMS.databaseAdapter.findAllOrganizations();
				const organizationId = orgs[0]?.id;
				if (!organizationId) return c.json({ success: false, error: 'No organization' }, 500);

				const limit = Math.min(Number(c.req.query('limit') ?? 50) || 50, 200);
				const offset = Number(c.req.query('offset') ?? 0) || 0;
				// Submissions live in generic plugin storage under (plugin:'forms', collection:formId).
				const page = await c.var.aphexCMS.databaseAdapter.listPluginRecords({
					organizationId,
					plugin: 'forms',
					collection: form.id,
					limit,
					offset
				});
				return c.json({ success: true, ...page });
			}
		},
		{
			// The admin UI: a sidebar tool rendering the read-only submissions table. cms-core owns
			// the `aphex/admin/tool` seam and renders this; the component fetches the GET route above.
			implements: 'aphex/admin/tool',
			id: 'forms.submissions',
			title: 'Submissions',
			icon: Inbox,
			placement: 'sidebar',
			// Match the GET route's gate so the tab only appears for those who can actually read the
			// inbox (admin/owner) — never shown-then-403 for editors/viewers.
			requiredCapabilities: ['org.settings'],
			component: FormsTool
		},
		{
			implements: 'aphex/event/consumer',
			id: 'forms.on-submit',
			events: [formSubmitted.type],
			async handler({ event, databaseAdapter, logger, emailAdapter }) {
				// The reaction: email whoever the form routes notifications to. Runs OUT of the submit
				// path (it's a durable delivery job), so a slow or failing mail provider never blocks
				// or fails the visitor's submit — it just retries here.
				const { formId, submissionId } = formSubmitted.parse(event.payload);
				const form = getForm(formId);

				// Nothing to route to, or email isn't configured (no RESEND_API_KEY in prod). Skip
				// quietly — returning acks the delivery; throwing would pointlessly retry a form that
				// will never have a recipient or an app that will never have a mailer.
				if (!form?.notifyEmail || !emailAdapter) {
					logger.info('📨 [forms] submission stored; notification skipped', {
						formId,
						submissionId,
						reason: !form?.notifyEmail ? 'no notifyEmail' : 'email not configured'
					});
					return;
				}

				// Resolve the answers from storage (the event carries only ids, never PII).
				const submission = await databaseAdapter.getPluginRecord(
					event.organizationId,
					submissionId
				);
				const data: Record<string, unknown> = submission?.data ?? {};

				// Render the answers as "Label: value" lines, ordered by the form's own fields so the
				// email reads in the same order it was authored. The callback param is annotated
				// because `.map` over the const-captured readonly tuple otherwise infers it as `never`.
				const lines = form.fields.map((f: { name: string; title?: string }) => {
					const v = data[f.name];
					return `${f.title ?? f.name}: ${v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v)}`;
				});

				// At-least-once delivery: a retry could send this twice. Acceptable for a notification
				// (a rare duplicate email beats a dropped one); a stricter consumer would dedupe on
				// `event.id`. Throwing on a transient send error is deliberate — it earns a retry.
				const result = await emailAdapter.send({
					from: EMAIL_FROM,
					to: form.notifyEmail,
					subject: `New "${form.title}" submission`,
					text: `You have a new submission.\n\n${lines.join('\n')}\n\nSubmission id: ${submissionId}`
				});
				if (result.error) {
					throw new Error(`[forms] notification email failed: ${result.error}`);
				}
				logger.info('📨 [forms] notification sent', {
					formId,
					submissionId,
					to: form.notifyEmail
				});
			}
		}
	]
});
