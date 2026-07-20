// Authoring helper for developer-owned forms — the forms counterpart to `defineType`.
//
// Wrapping a form in `defineForm({ ... })` captures the exact `fields` literal via a `const`
// type parameter, so `InferForm<typeof form>` recovers the submission shape with no codegen
// and no casts. A plain `FormDefinition` object literal works too; this only adds the typed
// ergonomics.
import type { Field } from '../types/schemas';
import type { FormDefinition } from './types';

/**
 * Define a form whose submission type is inferred from its own fields.
 *
 * @example
 * ```ts
 * export const contactForm = defineForm({
 *   id: 'contact',
 *   title: 'Contact us',
 *   fields: [
 *     { name: 'name', type: 'string', title: 'Name', validation: (R) => R.required() },
 *     { name: 'email', type: 'string', title: 'Email', validation: (R) => R.required().email() },
 *     { name: 'message', type: 'text', title: 'Message', validation: (R) => R.required() }
 *   ]
 * });
 *
 * type ContactSubmission = InferForm<typeof contactForm>;
 * // { name?: string; email?: string; message?: string }
 * ```
 */
export function defineForm<const F extends readonly Field[]>(
	form: Omit<FormDefinition, 'fields'> & { fields: F }
): FormDefinition<F> {
	return form;
}
