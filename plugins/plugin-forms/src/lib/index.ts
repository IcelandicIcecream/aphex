/**
 * First-party form-builder plugin — comparable to `@payloadcms/plugin-form-builder`.
 *
 * `formsPlugin()` contributes everything a form needs and nothing an app has to
 * wire:
 *
 *  - two collections, `form` and `formSubmission` (`aphex/schema`)
 *  - `POST /api/form-submissions`, public, with a honeypot and rate limiting
 *    (`aphex/server/route`)
 *  - a consumer that emails the form's notification list out of band
 *    (`aphex/event/consumer`)
 *
 * Add it to the plugins array and an editor can build a form; nothing goes in
 * `aphex.config.ts` beyond that.
 *
 * ## What the app still owns
 *
 * Rendering. The plugin defines what a form *is* and what happens when one is
 * submitted; how it looks belongs to the site, so the template ships a `FormBlock`
 * component that reads a form document and posts to the endpoint. That split is
 * deliberate — a plugin that shipped markup would have to ship a design with it.
 *
 * ## Layering
 *
 * cms-core already has `defineForm` — a form a *developer* writes in code. This
 * plugin is the same idea with the authoring moved into the studio: a `form`
 * document is compiled into a `FormDefinition` and validated by the identical
 * engine (see `compile.ts`). One validator, two ways to author.
 */
import { definePlugin, effectiveOrganizationRole } from '@aphexcms/cms-core';
import SubmissionView from './SubmissionView.svelte';
import type { AccessRule, PluginPart, SchemaAccess, SchemaType } from '@aphexcms/cms-core';
import { formSchema, formSubmissionSchema } from './schema';
import { handleSubmit } from './submit';
import { confirmSubmission, notifyOnSubmission } from './notify';
import type { FormSiteResolver } from './sender';
import type { PrepareFormEmail } from './prepare';
import { formSubmissionCreated } from './events';

const PLUGIN_ID = '@aphexcms/plugin-forms';

export interface FormsPluginOptions {
	/**
	 * The address notification emails are sent from. The app owns its sending
	 * identity, so this is passed in rather than guessed; falls back to
	 * `APHEX_EMAIL_FROM`. With neither set, submissions are still stored and a
	 * configured notification retries, then dead-letters visibly in Activity.
	 */
	from?: string;

	/**
	 * The site a form belongs to, for an app that runs several: its name, shown in
	 * front of `from` on every email (`"Lily's Bakery" <forms@example.com>`), and
	 * its own address, which hears about messages from a form that names nobody
	 * and takes replies to a visitor's confirmation. Server only; read when a form
	 * is submitted and kept with the submission.
	 */
	site?: FormSiteResolver;

	/**
	 * Called with each email before it's sent: limit who may be written to and how
	 * much, or give it a design. An app where anyone can sign up should set this: a
	 * form emails whatever addresses its author typed. Server only.
	 */
	prepareEmail?: PrepareFormEmail;

	/**
	 * Put in front of the help in the form editor, to say what `prepareEmail` does:
	 * on who hears about messages, and on the visitor's own email.
	 */
	help?: { recipients?: string; confirmation?: string };

	/**
	 * Override submission collection access. Defaults to owner/admin read and
	 * delete access, with direct create/update/publish operations blocked. Partial
	 * overrides are merged with those defaults, so adding a custom reviewer role
	 * does not accidentally reopen writes.
	 */
	submissionAccess?: SchemaAccess;

	/**
	 * Where the admin previews a form, beside the editor, the way a page opens next
	 * to itself. The plugin ships no markup (see "What the app still owns"), so the
	 * app names its own page that draws one form; usually it's built from the
	 * third argument, the form's id. Unset, a form has no preview.
	 */
	previewUrl?: SchemaType['previewUrl'];
}

function strictSubmissionRule(rule: AccessRule | undefined): AccessRule | undefined {
	if (!Array.isArray(rule)) return rule;
	return ({ auth }) => rule.includes(effectiveOrganizationRole(auth) ?? '');
}

export function formsPlugin(options: FormsPluginOptions = {}) {
	const mergedAccess = { ...formSubmissionSchema.access, ...options.submissionAccess };
	const submissionSchema: typeof formSubmissionSchema = {
		...formSubmissionSchema,
		access: Object.fromEntries(
			Object.entries(mergedAccess).map(([operation, rule]) => [
				operation,
				strictSubmissionRule(rule)
			])
		) as SchemaAccess
	};

	const help: Record<string, string | undefined> = {
		emails: options.help?.recipients,
		confirmationEmail: options.help?.confirmation
	};
	const form: SchemaType = {
		...formSchema,
		...(options.previewUrl ? { previewUrl: options.previewUrl } : {}),
		fields: formSchema.fields.map((field) =>
			help[field.name]
				? { ...field, description: `${help[field.name]} ${field.description ?? ''}`.trim() }
				: field
		)
	};

	const parts: PluginPart[] = [
		{
			implements: 'aphex/schema',
			schemas: [form, submissionSchema]
		},
		{ implements: 'aphex/field/component', input: 'form-submission', component: SubmissionView },
		{
			implements: 'aphex/server/route',
			id: 'forms.submit',
			method: 'POST',
			path: '/form-submissions',
			handler: (c) => handleSubmit(c, options.site),
			/*
			 * The one endpoint here that must be open: a form is for people who
			 * don't have accounts. Opting out of the capability gate is deliberate
			 * and the handler does its own verification — it validates against the
			 * form's declared fields, drops undeclared keys, rate-limits per IP and
			 * carries a honeypot. See `submit.ts`.
			 */
			requiredCapabilities: 'public'
		},
		{
			implements: 'aphex/event/consumer',
			id: 'forms.notify',
			events: [formSubmissionCreated.type],
			handler: notifyOnSubmission(options.from, options.prepareEmail)
		},
		{
			implements: 'aphex/event/consumer',
			id: 'forms.confirm',
			events: [formSubmissionCreated.type],
			handler: confirmSubmission(options.from, options.prepareEmail)
		}
	];

	return definePlugin({ name: PLUGIN_ID, version: '0.1.1', parts });
}

export {
	defaultSubmissionAccess,
	formSchema,
	formSubmissionSchema,
	formFieldTypes
} from './schema';
export { compileForm, isInputField, optionValue } from './compile';
export type {
	ConfirmationEmailValue,
	FormDocument,
	FormFieldValue,
	NotificationEmailValue
} from './compile';
export { formSubmissionCreated } from './events';
export { fromHeader, isEmailAddress } from './sender';
export type { FormSite, FormSiteResolver } from './sender';
export { renderTemplate, fieldLabels, toStoredValue } from './template';
export type { OutgoingFormEmail, PreparedFormEmail, PrepareFormEmail } from './prepare';
export type { Answer } from './template';
