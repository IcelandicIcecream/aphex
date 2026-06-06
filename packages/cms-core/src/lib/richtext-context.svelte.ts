import { getContext, setContext } from 'svelte';
import type { Editor } from '@tiptap/core';

const KEY = Symbol('aphex:richtext-editors');

type EditorRegistry = Map<string, Editor>;

/** Call once in DocumentEditor to create the registry. */
export function setRichtextEditorRegistry(): EditorRegistry {
	const registry: EditorRegistry = new Map();
	setContext(KEY, registry);
	return registry;
}

/** Call in RichtextField to register/unregister the editor instance. */
export function getRichtextEditorRegistry(): EditorRegistry | null {
	return getContext<EditorRegistry>(KEY) ?? null;
}
