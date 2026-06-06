import { vercelStegaClean, vercelStegaDecode } from '@vercel/stega';

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
};

/** Decode the stega payload from a string. Returns null if not encoded. */
export function stegaDecode(value: string): StegaPayload | null {
	return vercelStegaDecode<StegaPayload>(value) ?? null;
}
