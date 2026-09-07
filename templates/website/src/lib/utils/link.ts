import { isResolvedRef, type ResolvedRef } from './reference';
import { control } from './stega';

/**
 * Turning a stored link into an href.
 *
 * There is exactly one link shape in this template (see
 * `schemaTypes/fields/link.ts`) and this is the only place that knows how it
 * becomes a URL — so adding a routed document type is a change here and nowhere
 * else.
 */

export interface CMSLinkValue {
	linkType?: string;
	label?: string;
	/** Already expanded by `resolveReferences` before it reaches a component. */
	reference?: ResolvedRef | null;
	url?: string;
	newTab?: boolean;
	appearance?: string;
}

/** The public URL of a document, given its type and slug. */
export function docHref(docType: string, slug: string | null | undefined): string | null {
	if (!slug) return null;
	// Both are logic, not text: in preview they arrive stega-encoded, and an
	// invisible character in a slug produces a 404 while a `docType` that no
	// longer matches any case falls through to `null` and kills the link.
	docType = control(docType);
	slug = control(slug);
	switch (docType) {
		case 'post':
			return `/posts/${slug}`;
		case 'category':
			return `/posts?category=${encodeURIComponent(slug)}`;
		case 'page':
			// The page slugged "home" is the front page, not /home.
			return slug === 'home' ? '/' : `/${slug}`;
		default:
			return null;
	}
}

/**
 * The href for a link, or `null` when it doesn't resolve to one — an internal
 * link whose target was deleted or never published, or a custom link with an
 * empty URL. Callers render the label as plain text in that case rather than
 * emitting a dead `<a href="">`.
 */
export function resolveHref(link: CMSLinkValue | null | undefined): string | null {
	if (!link) return null;
	// `control()` because these are decisions and destinations, never text on the
	// page — see $lib/utils/stega.ts.
	const url = control(link.url)?.trim() || null;
	if (control(link.linkType) === 'custom') return url;
	if (isResolvedRef(link.reference)) {
		return docHref(link.reference.docType, link.reference.slug);
	}
	// Default to the reference branch (it's the field's initial value), but fall
	// back to a custom URL if that's the only thing filled in.
	return url;
}

/** The visible text for a link: its own label, else the target document's title. */
export function resolveLabel(link: CMSLinkValue | null | undefined): string {
	if (!link) return '';
	if (link.label?.trim()) return link.label;
	if (isResolvedRef(link.reference) && link.reference.title) return link.reference.title;
	return link.url ?? '';
}
