---
'@aphexcms/postgresql-adapter': minor
'@aphexcms/sqlite-adapter': minor
'@aphexcms/cms-core': minor
---

Reconcile built-in roles on boot so `owner` picks up new capabilities

Built-in roles were seeded once, at organization creation, with
`onConflictDoNothing`. That is correct for creation but means an org seeded
before a capability existed never learns about it: the row is already there, so
the conflict clause skips it. Upgrading core silently left owners without newly
added permissions — `plugin.settings.manage` was invisible to owners of existing
orgs.

`owner` is now treated as an invariant rather than a default floor. It is defined
as the whole of `ALL_CAPABILITIES`, so `seedBuiltinRoles` reconciles it to that
set, and `CMSEngine.initialize()` re-seeds every organization on boot.
`admin`/`editor`/`viewer` are deliberately left untouched — they are editable, and
force-adding a capability could re-widen access an operator narrowed on purpose.
No role ever gains a permission automatically except `owner`, which by definition
already holds every one.

`PATCH /api/roles/owner` now rejects capability edits with a 403: the boot
reconcile would revert them at the next restart, so accepting the write would be
a lie. This mirrors the existing block on deleting built-in roles. Custom roles
remain the way to grant narrower access.
