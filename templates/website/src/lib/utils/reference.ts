/**
 * The shape a resolved reference takes on the public site, and the type-level
 * mirror of what `resolveReferences()` does to a document.
 *
 * Deliberately client-safe and separate from `$lib/server/references.ts`, which
 * does the actual resolving: components need this type and the guard, and
 * anything under `$lib/server` can't be imported into the browser bundle.
 */

/** A reference after resolution — enough to build a link and label it. */
export interface ResolvedRef {
	_type: 'resolvedReference';
	/** The referenced document's id. */
	id: string;
	/** Its schema name — `page`, `post`, `category`. Drives the URL prefix. */
	docType: string;
	title: string | null;
	slug: string | null;
	/** The referenced document's own image, when it has one (post cards use it). */
	image?: unknown;
	excerpt?: string | null;
}

export function isResolvedRef(value: unknown): value is ResolvedRef {
	return (
		!!value && typeof value === 'object' && (value as ResolvedRef)._type === 'resolvedReference'
	);
}

/**
 * What a document looks like *after* `resolveReferences()` has walked it: every
 * `{ _type: 'reference', _ref }` — however deeply nested, in arrays or objects —
 * replaced by a {@link ResolvedRef}.
 *
 * This exists so the resolution isn't a lie at the type level. The generated
 * types describe a post's `relatedPosts` as `Reference<Post>[]`, which is true
 * on disk and false by the time a component sees it. Returning `Resolved<T>`
 * from the resolver means `relatedPosts` is typed as `ResolvedRef[]` exactly
 * where it *is* one, so reading `.slug` off it needs no cast and reading it off
 * an unresolved value is still an error.
 *
 * An image field's `asset` is skipped by name. It's stored as the same
 * `{ _type: 'reference', _ref }` shape, but it points at an asset rather than a
 * document and is expanded by a different pass (`injectAssetUrls`) into a URL,
 * width, height and srcset. Mapping it here would claim it becomes a
 * `ResolvedRef`, which it never does — so `asset` keeps its own type, and
 * `resolveReferences` skips the same key at runtime.
 */
export type Resolved<T> = T extends { _type: 'reference'; _ref: string }
	? ResolvedRef
	: T extends Date
		? T
		: T extends Array<infer U>
			? Array<Resolved<U>>
			: T extends object
				? { [K in keyof T]: K extends 'asset' ? T[K] : Resolved<T[K]> }
				: T;
