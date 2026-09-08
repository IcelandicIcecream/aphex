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
import type { AccessRule, PluginPart, SchemaAccess } from '@aphexcms/cms-core';
import { formSchema, formSubmissionSchema } from './schema';
import { handleSubmit } from './submit';
import { notifyOnSubmission } from './notify';
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
	 * Override submission collection access. Defaults to owner/admin read and
	 * delete access, with direct create/update/publish operations blocked. Partial
	 * overrides are merged with those defaults, so adding a custom reviewer role
	 * does not accidentally reopen writes.
	 */
	submissionAccess?: SchemaAccess;
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

	const parts: PluginPart[] = [
		{
			implements: 'aphex/schema',
			schemas: [formSchema, submissionSchema]
		},
		{
			implements: 'aphex/server/route',
			id: 'forms.submit',
			method: 'POST',
			path: '/form-submissions',
			handler: handleSubmit,
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
			handler: notifyOnSubmission(options.from)
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
export type { FormDocument, FormFieldValue, NotificationEmailValue } from './compile';
export { formSubmissionCreated } from './events';
export { renderTemplate, fieldLabels, toStoredValue } from './template';
export type { Answer } from './template';
