// schema-utils/define-type.ts
//
// Optional authoring helper. Wrapping a schema in `defineType({ ... })` instead
// of annotating `const x: SchemaType = { ... }` lets TypeScript capture the exact
// `fields` tuple and infer the document shape — so `beforeValidate` hooks receive
// a typed `data` with no codegen and no casts in your schema.
//
// Backwards compatible: plain `SchemaType` object literals keep working exactly
// as before. This is opt-in, only for the typed-hook ergonomics.

import type { Field, SchemaType, SchemaHooks, InferFields } from '../types/schemas';

/**
 * Define a schema with hooks typed from its own fields.
 *
 * @example
 * ```ts
 * export default defineType({
 *   type: 'document',
 *   name: 'contactSubmission',
 *   title: 'Contact Submission',
 *   fields: [
 *     { name: 'email', type: 'string', title: 'Email' },
 *     { name: 'subscribed', type: 'boolean', title: 'Subscribed' }
 *   ],
 *   hooks: {
 *     beforeValidate: [
 *       // `data.email` is `string | undefined`, `data.subscribed` is `boolean | undefined`
 *       ({ data }) => ({ ...data, email: data.email?.trim().toLowerCase() })
 *     ]
 *   }
 * });
 * ```
 *
 * The `const` type parameter preserves the field literals; `hooks` uses the
 * inferred type through a mapped type (a non-inferential position), so `fields`
 * is the sole inference site and `data` is contextually typed from it.
 */
export function defineType<const F extends readonly Field[]>(
	schema: Omit<SchemaType, 'fields' | 'hooks'> & {
		fields: F;
		hooks?: SchemaHooks<InferFields<F>>;
	}
): SchemaType {
	// One controlled widening: the registry stores the loose `SchemaType` (fields
	// as a mutable array, hooks with the erased generic). Runtime is unaffected.
	return schema as unknown as SchemaType;
}
