import { SvelteMap } from 'svelte/reactivity';

// Lightweight pub/sub so any UI showing a referenced document's snapshot
// (ReferenceField, list rows, etc.) can refetch when that document is
// edited elsewhere in the same session — typically when a side-panel
// editor saves a doc that the parent doc references.
//
// Backed by SvelteMap rather than a plain $state record so reads on keys
// that don't exist yet still register a fine-grained dependency — without
// this, the first call to getDocumentVersion(id) would not subscribe the
// calling effect to subsequent notifies for that id.

const versions = new SvelteMap<string, number>();

export function getDocumentVersion(documentId: string | null | undefined): number {
	if (!documentId) return 0;
	return versions.get(documentId) ?? 0;
}

export function notifyDocumentChanged(documentId: string): void {
	if (!documentId) return;
	versions.set(documentId, (versions.get(documentId) ?? 0) + 1);
}
