---
'@aphexcms/cms-core': minor
'@aphexcms/postgresql-adapter': minor
'@aphexcms/sqlite-adapter': minor
---

Add compare-and-swap (CAS) concurrency control for document writes — Milestone 1 of the content-copilot plan (`references/content-copilot-phase-1-plan.md`), and useful on its own: two browser tabs open on the same document no longer silently clobber each other.

- `cms_documents` gains a monotonic `revision` column, incremented on every draft write.
- `updateDocDraft`/`publishDoc`/`unpublishDoc` (both adapters) and `VersionService.restoreVersion` accept an optional `expectedRevision`; a mismatch throws `RevisionConflictError` (`documentId`/`expectedRevision`/`currentRevision`) instead of overwriting. Omitting `expectedRevision` preserves the previous unconditional last-write-wins behavior — fully backward compatible.
- Threaded through `CollectionAPI.update`/`publish`/`unpublish`, the zod request/response schemas (`expectedRevision` in, `revision` out via `_meta`), and the HTTP routes (`RevisionConflictError` → 409 with `currentRevision`).
- `DocumentEditor.svelte` sends the revision it last read on autosave, publish, unpublish, and version-restore, and surfaces a 409 distinctly ("this document was changed elsewhere, reload") instead of a generic save error or a silent overwrite.
- Fixed a gap the cross-dialect conformance suite caught: `PostgreSQLAdapter`/`SQLiteAdapter`'s org-hierarchy wrapper (the class `apps/studio` actually talks to) wasn't forwarding `expectedRevision` to the underlying document adapter, so CAS would have been a no-op end-to-end despite being correctly implemented one layer down. Fixed by threading the parameter through a shared `withHierarchyFallback` helper (also de-duplicating four near-identical hierarchy-retry blocks per adapter).
- New cross-dialect conformance coverage (`packages/sqlite-adapter/tests/conformance.spec.ts`, run against both pglite and libsql): revision incrementing, the two-tabs stale-write rejection, publish/unpublish CAS, and unconditional-write-still-works-when-omitted.
