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

- **feat(api): move invitation email-wrap into `aphex.config.ts → api`**
  - Deleted: `src/routes/api/organizations/invitations/+server.ts` —
    the SK shim that wrapped the built-in invite handler to send email.
  - Added: `src/lib/server/email/invitation-hook.ts` — same logic, now a
    Hono middleware registered via `config.api`. Runs BEFORE built-in
    routes mount (Hono is registration-order-strict, so middleware needs
    to register first to wrap a downstream handler).
  - `aphex.config.ts` now passes `api: (app) => registerInvitationEmailHook(app)`.
  - Why: lets us drop the last invitation-related entry from
    `routes-exports.ts` and the matching SK route file in cms-core. The
    only remaining `routes-exports` entry is `serveAssetCDN` (CDN URLs
    live outside `/api` so can't move onto the catch-all).
  - Upgrade: copy `src/lib/server/email/invitation-hook.ts` and the new
    `api:` block in `aphex.config.ts`; delete your old
    `src/routes/api/organizations/invitations/+server.ts`.

- **feat(api): replace per-endpoint `+server.ts` shims with a single Hono catch-all**
  - Added: `src/routes/api/[...slug]/+server.ts` — forwards any unmatched
    `/api/**` request to the Aphex Hono app on `event.locals.aphexCMS.apiApp`.
  - Deleted (24 files) — all CMS-feature shims that just re-exported handlers
    from `@aphexcms/cms-core/server`. They're now served by the catch-all:
    - `src/routes/api/{schemas,documents,assets,organizations,roles,user}/+server.ts`
    - `src/routes/api/schemas/[type]/+server.ts`
    - `src/routes/api/documents/{query,[id]}/+server.ts`
    - `src/routes/api/documents/[id]/{publish,versions}/+server.ts`
    - `src/routes/api/documents/[id]/versions/[version]/+server.ts`
    - `src/routes/api/documents/[id]/versions/[version]/restore/+server.ts`
    - `src/routes/api/assets/{bulk,[id]}/+server.ts`
    - `src/routes/api/assets/[id]/references/+server.ts`
    - `src/routes/api/assets/references/counts/+server.ts`
    - `src/routes/api/organizations/{switch,members,[id]}/+server.ts`
    - `src/routes/api/roles/[name]/+server.ts`
    - `src/routes/api/user/{cms-preference,reset-password,request-password-reset}/+server.ts`
  - Kept (studio-locals — your own endpoints): `instance-settings`,
    `invitations`, `invitations/[id]/{accept,reject}`,
    `organizations/invitations`, `settings/api-keys`, `settings/api-keys/[id]`.
  - Why: SvelteKit prefers specific routes over the catch-all, so any
    `+server.ts` you keep wins. Custom endpoints can still go in
    `src/routes/**/+server.ts` as before, OR be registered onto the Hono
    app via `aphex.config.ts → api: (app) => { app.post(...) }`.
  - Upgrade: copy `src/routes/api/[...slug]/+server.ts` from the template,
    then delete any of the 24 shims you haven't customized. If you
    customized one, leave it — it'll continue to win over the catch-all.

## 0.0.2

- **chore(deps): bump `@aphexcms/cms-core` to `^2.1.2` and `@aphexcms/ui` to `^0.3.4`**
  - Fixes ESM resolution of the `schema-context.svelte` rune module
    (`ERR_MODULE_NOT_FOUND`) and adds the `svelte` export condition on
    subpath exports (`/client`, `/server`, `/schema`, `/routes/*`, etc.) so
    SvelteKit's Vite plugin claims them instead of Node's default loader
    trying to import raw `.svelte` files (`ERR_UNKNOWN_FILE_EXTENSION`).
  - No source changes required in the template — reinstall to pick it up.

- **chore(styles): drop `@import '@aphexcms/ui/themes/aphex'` from `src/app.css`**
  - The `@aphexcms/ui/themes/aphex` theme file was removed from
    `@aphexcms/ui@0.3.4`. If you kept that import in your own `app.css`,
    delete the line when you upgrade or the build will fail to resolve it.

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
