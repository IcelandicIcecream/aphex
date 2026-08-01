---
'@aphexcms/cms-core': minor
'@aphexcms/postgresql-adapter': minor
'@aphexcms/sqlite-adapter': minor
---

Add an audit/undo trail for the in-admin AI assistant's writes — `cms_agent_change_sets` (one row per agent turn, capturing `provider`/`model`/`promptTokens`/`completionTokens` for cost/usage auditing regardless of whether the turn mutated anything) and `cms_agent_operations` (one row per mutating tool call, with the document-version numbers an undo restores between).

- New `AgentChangeSetAdapter` port (`createChangeSet`/`recordOperation`/`completeChangeSet`/`getChangeSet`/`listChangeSets`), implemented in both relational adapters, mirroring the `EventJobAdapter`/`cms_domain_events` schema pattern (org-scoped, RLS on Postgres, WHERE-scoped on SQLite) — proven identical across dialects by the cross-dialect conformance suite.
- `POST /api/agent/chat` now eagerly creates a change-set per turn and records every mutating tool call against it, best-effort (a recording failure never breaks the chat itself).
- New `POST /api/agent/change-sets/:id/undo` reuses the existing CAS-guarded `VersionService.restoreVersion` — the same primitive the document editor's own version-restore already calls — so undo is not new revert logic, just "restore to the version before this operation," applied in reverse order. Known limitation: `create_document` operations aren't undoable (no delete primitive wired in), and undo never auto-unpublishes.
- `ActivityView.svelte` gains an "Agent Changes" tab: change-set list with provider/model/token counts, expandable per-turn operation detail, and an Undo button.
