// document-workspace-registry.svelte.ts — module-level singleton, same pattern as
// agent-chat-state.svelte.ts.
//
// Answers "which live document session is open in this tab, and here's a handle to it" —
// deliberately named/scoped that way rather than as an AI-specific registry, since it's the
// same lookup a future multiplayer presence feature would need (see
// types/document-workspace.ts). `DocumentEditor.svelte` registers its `DocumentWorkspace`
// here while mounted and clears it on unmount; `AgentChat.svelte` reads it to decide whether
// to bridge a chat request into the currently open document.
//
// Not persisted to localStorage — a live object reference is meaningless across a reload.

import type { DocumentWorkspace } from './types/document-workspace';

export interface RegisteredDocumentWorkspace {
	documentId: string;
	collection: string;
	workspace: DocumentWorkspace;
}

function createDocumentWorkspaceRegistry() {
	let current = $state<RegisteredDocumentWorkspace | null>(null);

	return {
		get current() {
			return current;
		},
		register(entry: RegisteredDocumentWorkspace) {
			current = entry;
		},
		/** Id-checked: an editor that already unmounted (and cleared with its own id) can't
		 * clobber a newer registration from a different document that mounted in its place
		 * during fast navigation. */
		clear(documentId: string) {
			if (current?.documentId === documentId) current = null;
		}
	};
}

export const documentWorkspaceRegistry = createDocumentWorkspaceRegistry();
