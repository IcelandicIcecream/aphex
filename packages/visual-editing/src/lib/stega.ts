import { vercelStegaClean, vercelStegaCombine, vercelStegaDecode } from '@vercel/stega';

/**
 * Remove all stega-encoded data from a string or deep JSON structure.
 * Use in <svelte:head> (title, meta), alt text, aria-labels, comparisons.
 */
export function stegaClean<T>(value: T): T {
	return vercelStegaClean(value);
}

export type StegaPayload = {
	field: string;
	blockIndex?: number;
	blockKey?: string;
	arrayIndex?: number;
	objectPath?: string;
	/**
	 * Target a *different* document than the one being previewed. Use for content
	 * whose reference lives at the app level, not in the document — e.g. an
	 * app-queried "list of posts" block: stamp each card with the post's own id/type
	 * and clicking it opens that post, even though the page never stored the link.
	 */
	documentId?: string;
	documentType?: string;
};

/**
 * Stamp a navigation payload onto a string as invisible stega characters.
 *
 * The CMS auto-encodes a document's own string fields, but values that aren't
 * literally in the document — a resolved `reference` label, a denormalized
 * title — have nothing to stamp. Encode those at render time so the overlay
 * treats them like any other clickable field. Returns the value unchanged if
 * it's empty.
 */
export function stegaEncode(value: string, payload: StegaPayload): string {
	if (!value) return value;
	return vercelStegaCombine(value, payload as unknown as Record<string, unknown>);
}

/** Decode the stega payload from a string. Returns null if not encoded. */
export function stegaDecode(value: string): StegaPayload | null {
	return vercelStegaDecode<StegaPayload>(value) ?? null;
}
