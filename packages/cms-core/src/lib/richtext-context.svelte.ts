import { getContext, setContext } from 'svelte';
import type { Editor } from '@tiptap/core';

const KEY = Symbol('aphex:richtext-editors');

/**
 * A registered richtext editor plus the imperative hooks DocumentEditor needs for
 * click-to-edit — e.g. opening the link popover after dropping the caret in a link,
 * rather than relying on the editor's transaction heuristic to notice the selection move.
 */
export interface RichtextEditorHandle {
	editor: Editor;
	/** Open the link action popover for the link at the current selection. */
	openLinkPopover: () => void;
}

type EditorRegistry = Map<string, RichtextEditorHandle>;

/** Call once in DocumentEditor to create the registry. */
export function setRichtextEditorRegistry(): EditorRegistry {
	const registry: EditorRegistry = new Map();
	setContext(KEY, registry);
	return registry;
}

/** Call in RichtextField to register/unregister the editor handle. */
export function getRichtextEditorRegistry(): EditorRegistry | null {
	return getContext<EditorRegistry>(KEY) ?? null;
}
