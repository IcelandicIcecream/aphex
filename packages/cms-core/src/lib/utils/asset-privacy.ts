// Deciding whether an asset is private.
//
// An asset does not store "private". It stores a *pointer* to the field it was
// uploaded into — `metadata.schemaType` and `metadata.fieldPath` — and the
// answer is recomputed from the live schema on every request. That is what makes
// flipping `private: true` in code take effect immediately, with no migration.
//
// It also means the answer can stop being computable. Rename or delete that
// field and the pointer dangles: the lookup returns nothing, and "we don't know"
// used to be treated as "public" — so renaming a private field silently
// published every asset behind it. Hence the second half of this file: a
// resolved value is also stamped onto the asset at upload, and used as the
// fallback when the live lookup fails.

import type { Field, SchemaType } from '../types/schemas';

/** Field types that hold an asset reference and therefore support `private`. */
const ASSET_FIELD_TYPES = new Set(['image', 'file']);

/**
 * Walk a dotted field path (`coverImage`, `seo.ogImage`) to its definition.
 *
 * Descends through `object` fields only. A path into an array or a named type
 * reference returns null rather than guessing — see {@link resolveFieldPrivacy}
 * for what a null means.
 */
export function findFieldByPath(fields: Field[], path: string): Field | null {
	const parts = path.split('.');
	let current: Field | null = null;
	let scope: Field[] = fields;

	for (let i = 0; i < parts.length; i++) {
		current = scope.find((field) => field.name === parts[i]) ?? null;
		if (!current) return null;

		if (i < parts.length - 1) {
			const nested = current as Field & { fields?: Field[] };
			if (current.type !== 'object' || !nested.fields) return null;
			scope = nested.fields;
		}
	}

	return current;
}

/**
 * Is the field at this path private?
 *
 * `true`/`false` when the field resolves, and **`null` when it doesn't** — the
 * schema is gone, the field was renamed, or the path leads somewhere this walker
 * doesn't follow. Null is deliberately distinct from `false`: the caller has a
 * stored fallback for "unknown" and must not read it as "public".
 */
export function resolveFieldPrivacy(
	schema: SchemaType | null | undefined,
	fieldPath: string | undefined
): boolean | null {
	if (!schema?.fields || !fieldPath) return null;

	const field = findFieldByPath(schema.fields, fieldPath);
	if (!field || !ASSET_FIELD_TYPES.has(field.type)) return null;

	return (field as Field & { private?: boolean }).private === true;
}

/**
 * The final answer, from the live schema first and the stamped value second.
 *
 * Order matters. The live schema wins whenever it can answer, so toggling
 * `private` in code still takes effect at once for every asset pointing at that
 * field. The stamp is consulted only when the pointer no longer resolves, which
 * is exactly the rename/delete case that used to fail open.
 *
 * An asset with neither — uploaded through the media library before this
 * existed, or through the API with no field context — is public, as it always
 * was. Treating "no information at all" as private would turn every existing
 * library asset inaccessible overnight, which is a different kind of broken.
 */
export function isAssetPrivate(
	resolved: boolean | null,
	stampedPrivate: unknown
): { isPrivate: boolean; usedFallback: boolean } {
	if (resolved !== null) return { isPrivate: resolved, usedFallback: false };
	return { isPrivate: stampedPrivate === true, usedFallback: stampedPrivate === true };
}
