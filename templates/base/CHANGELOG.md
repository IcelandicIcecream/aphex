---
**Heads up:** This project was scaffolded from `@aphexcms/base` `v0.0.2`.
When upgrading, read `CHANGELOG.md` in the template repo for notes on
what changed upstream and which files you may want to port into your
customized project.
---

# AphexCMS Template Changelog

Notes for users upgrading an existing project scaffolded from this template.
Because the template is meant to be customized, changes here are **not**
automatically applied to your project — this file describes what changed
upstream so you can cherry-pick the bits you care about.

Format: each entry lists the files touched and a one-line reason. Use
`git diff` against the mirror repo (`IcelandicIcecream/aphex-base`) at the
tag matching the version you started from to see the exact changes.

## Unreleased

_Add entries here as studio → template syncs land. Move to a versioned
section when cutting a release._

## 0.0.2

- **chore(deps): bump `@aphexcms/cms-core` to `^2.1.0`**
  - Fixes ESM resolution of the `schema-context.svelte` rune module (the
    installed package was failing with `ERR_MODULE_NOT_FOUND` on dev/build).
  - No source changes required in the template — reinstall to pick up it.

- **fix(admin): delete-asset modal + document-editor header + boolean autosave**
  - All three fixes live in `@aphexcms/cms-core`; upgrading the dep is enough.
  - Long asset filenames no longer stretch the delete confirm dialog.
  - Document editor top-row actions are vertically centered.
  - Autosave compares against an initial-defaults snapshot — unchecking a
    boolean now saves, and fields with `initialValue: true` no longer
    auto-create an empty doc on mount.

- **chore(drizzle): regenerate initial migration**
  - `drizzle/0000_tiny_redwing.sql`, `drizzle/meta/0000_snapshot.json`, `drizzle/meta/_journal.json`
  - Template migration was stale vs. the current schema (missing
    `cms_document_versions`, `cms_instance_settings`, `cms_roles`, the
    `version_event` enum, and the `unpublished` document status).
  - If you've already run `db:push` against your project DB you're fine;
    users starting fresh from this template will now get the full schema.

- **chore(admin): comment out `<PermissionsDebug />`**
  - `src/routes/(protected)/admin/+layout.svelte`
  - Debug overlay disabled by default in the shipped template.

<!--
Example entry:

- **fix(members): reject self-invitation and duplicate members**
  - `src/routes/(protected)/admin/settings/members/+page.svelte`
  - Handled server-side in cms-core; UI unchanged. Safe to skip if you
    haven't customized the invite flow.

- **feat(versions): add document versions API routes**
  - `src/routes/api/documents/[id]/versions/+server.ts`
  - `src/routes/api/documents/[id]/versions/[version]/+server.ts`
  - `src/routes/api/documents/[id]/versions/[version]/restore/+server.ts`
  - Clean re-exports from `@aphexcms/cms-core/server`. Port these over to
    get version history in your admin UI.
-->

## 0.0.1

- Initial template.
