// Form definition types. A form's fields REUSE the CMS field model, so a form validates with
// the exact same engine the admin uses — no separate validation library, and every field type
// and `Rule` already works. Authored with `defineForm` for compile-time inference; the runtime
// validator is compiled from this definition when the server resolves it (no codegen).
import type { Field, InferFields } from '../types/schemas';

/**
 * A developer-authored form. `id` is the stable public key (submission endpoint + event
 * payload); `fields` is an ordinary CMS field array, so a text field, an email (a `string`
 * with an email `Rule`), a number, a boolean, etc. all just work.
 *
 * The type parameter preserves the exact field literals when built via `defineForm`, which is
 * what lets `InferForm<typeof form>` recover the submission shape with no generated types.
 */
export interface FormDefinition<F extends readonly Field[] = readonly Field[]> {
	/** Stable public id — the submission key and the `form.submitted` payload's `formId`. */
	id: string;
	title: string;
	/** The form's fields, reusing the CMS field DSL. */
	fields: F;
	/** Optional message a client can show after a successful submit. */
	successMessage?: string;
	/**
	 * Optional input transform, run on the raw submission BEFORE validation — the one thing
	 * validation can't do (it judges, never mutates): `trim()` strings, lowercase an email, coerce
	 * shapes. Return the transformed data. This is the forms-native equivalent of a schema's
	 * `beforeValidate` hook — a form isn't a document, so it owns its own input shaping here rather
	 * than borrowing the document-hook machinery. Rejection (required, format) still belongs in a
	 * field's `validation` Rule; side effects (notify) belong in a `form.submitted` consumer.
	 */
	transform?: (data: Record<string, unknown>) => Record<string, unknown>;
	/**
	 * Where a "new submission" notification is sent. One address or several. Kept next to the form
	 * definition so the routing decision lives with the form, not in a global env var — different
	 * forms notify different inboxes. Omit to store-only (no notification); a notification consumer
	 * skips forms without it. The email itself is sent out of band by a `form.submitted` consumer,
	 * never in the submit path.
	 */
	notifyEmail?: string | string[];
	/**
	 * Persist submissions to `cms_plugin_storage` (under `plugin:'forms', collection:id`). Default
	 * `true`. Set `false` for a
	 * "just email me" form — the `form.submitted` event still fires (so notification consumers
	 * run), but nothing is stored. Matches the real split where some forms only notify.
	 */
	store?: boolean;
}

/**
 * The typed shape of a form's submission data, inferred from its fields. Values are
 * `T | undefined` (a submission may omit optional fields); required-ness is enforced at
 * runtime by validation, exactly as in the rest of the CMS.
 */
export type InferForm<D> = D extends FormDefinition<infer F> ? InferFields<F> : never;
