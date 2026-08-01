---
'@aphexcms/cms-core': minor
---

Add the workspace bridge for the in-admin content agent (Milestone 3 of `references/content-copilot-phase-1-plan.md`) — lets the agent edit the document a user currently has open in `DocumentEditor.svelte`, buffered against the live editor state and flushed as a single CAS-guarded save, instead of only being able to write straight to the DB.

- `types/document-workspace.ts` — the `DocumentWorkspace` interface (`getSnapshot`/`apply`/`validate`/`flushSave`/`publish`/`beginBatch`/`endBatch`) a live document session exposes; deliberately shaped as "a live handle onto a document's editable state" rather than "what the AI needs," so a future multiplayer feature can reuse the same primitives.
- `document-workspace-registry.svelte.ts` — module-level singleton (same pattern as `agent-chat-state.svelte.ts`) tracking which document sessions are currently open in this tab.
- `ai/content-workspace-tools.ts` — `content_patch_fields`/`content_save_draft`, both `execution: 'workspace'`; their `execute` bodies are unreachable by design, since `run-agent-turn.ts`'s pause branch guarantees they're never called server-side.
- `ai/run-agent-turn.ts` — partitions a round's tool calls by `execution`, runs `server`-mode calls as before, and pauses (`finishReason: 'awaiting_workspace_tool'`) instead of executing `workspace`-mode calls, leaving them for the client to resolve against the registered `DocumentWorkspace` and resume.
- `mcp/tools.ts`'s `resolveAgentTools(deps, opts?)` gains an optional `{ documentContext }` param: appends the two workspace tools only when a document context is present, and **removes `update_document` from the list** in that case — a document open in the editor now has exactly one write path (the workspace tools), not a prompt-level preference the model could still bypass.
- `DocumentEditor.svelte` builds a `documentWorkspace` object and registers it on mount; `AgentChat.svelte` cross-checks it against the URL's `docType`/`docId` before attaching `documentContext`, resolves paused tool calls, and auto-flushes via `content_save_draft` if the model applied patches but never explicitly saved.
- `document-refresh.svelte.ts` gains `getCollectionVersion`/`notifyCollectionChanged` (sibling to the existing per-document version pub/sub) so a collection **list** view refreshes after the agent creates/updates/publishes a document elsewhere in the session; `AdminApp.svelte` debounces the refetch (300ms) so a bulk agent operation doesn't fire one refetch per document.
