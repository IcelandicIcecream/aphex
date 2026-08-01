// types/document-workspace.ts
//
// A live handle onto a document currently open (and possibly unsaved) in an editor tab —
// not an AI-specific type. The agent's `content_patch_fields`/`content_save_draft` tools
// (ai/content-workspace-tools.ts) are its first consumer, not its only intended one: a
// future multiplayer feature would need the exact same primitives (apply an incoming
// operation to the live draft, batch/suppress autosave while a burst of operations lands,
// find which document sessions are open in this tab). `apply()`'s operation type and
// `beginBatch()`'s source are both open unions for that reason — a new consumer is a new
// union member, not a redesign of this interface.
//
// Client-safe: no server imports. Implemented by `DocumentEditor.svelte`, registered into
// `document-workspace-registry.svelte.ts` while mounted.

/** A change to apply to the open document's in-memory draft. Extensible — a future
 * operation kind (e.g. replaying a multiplayer remote op) is a new variant here, routed
 * through the same `apply()`/`validate()`/CAS-save pipeline, not a new bridge. */
export type DocumentWorkspaceOperation = {
	type: 'patchFields';
	/** Shallow-merged onto the current draft, same semantics as a manual field edit and as
	 * `CollectionAPI.update`'s own merge — whole-value replacement per top-level field key. */
	fields: Record<string, unknown>;
};

/** Who's driving a batch of operations. `'agent'` is the only real source today; the type
 * stays an open string so a future source (e.g. a multiplayer sync layer) doesn't require
 * changing this type — just adding a caller. */
export type DocumentWorkspaceBatchSource = 'agent' | (string & {});

export interface DocumentWorkspaceSnapshot {
	documentId: string | null;
	collection: string;
	data: Record<string, unknown>;
	status: 'new' | 'draft' | 'published' | 'unpublished';
	revision: number | null;
}

export interface DocumentWorkspaceValidationResult {
	isValid: boolean;
	errors: { field: string; errors: string[] }[];
}

export interface DocumentWorkspaceSaveResult {
	success: boolean;
	revision?: number;
	/** True when the write was rejected by the CAS revision check — the caller should treat
	 * this distinctly from a generic failure (matches the existing 409 handling in
	 * `DocumentEditor.svelte`'s manual save/publish/restore paths). */
	conflict?: boolean;
	error?: string;
}

export interface DocumentWorkspace {
	getSnapshot(): DocumentWorkspaceSnapshot;
	getSelection(): { fieldName: string | null };
	/** Mutates the in-memory draft only — never persists. */
	apply(operation: DocumentWorkspaceOperation): void;
	validate(): Promise<DocumentWorkspaceValidationResult>;
	flushSave(expectedRevision: number | undefined): Promise<DocumentWorkspaceSaveResult>;
	publish(expectedRevision: number | undefined): Promise<DocumentWorkspaceSaveResult>;
	/** Suppresses the editor's own autosave debounce until `endBatch()` — so a burst of
	 * `apply()` calls (e.g. one agent turn's patches) doesn't produce one CAS write per
	 * patch. Exactly one `flushSave` should follow before/at `endBatch()`. */
	beginBatch(source: DocumentWorkspaceBatchSource): void;
	endBatch(): void;
}
