---
**Heads up:** This project was scaffolded from `@aphexcms/base` `v0.0.3`.
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

- **fix(build): no more dummy `.env` required to `pnpm build`**
  - `src/lib/server/db/index.ts` — guards `pgConnectionUrl(env)` with
    SvelteKit's `building` flag, falling back to a placeholder URL during
    the build/analyse pass. postgres-js connects lazily, so the placeholder
    is never dialed.
  - `src/lib/server/email/index.ts` — uses the Mailpit adapter as a no-op
    stub when `building` is true so `RESEND_API_KEY` isn't required.
  - `src/lib/server/auth/better-auth/instance.ts` — supplies placeholder
    `secret` and `baseURL` during `building` so `betterAuth()` doesn't throw.
  - Why: SvelteKit's `vite build` runs an analyse worker that imports
    server modules to discover routes. Anything that throws at module
    init crashes the build — that's why the old template needed every
    runtime env var set just to compile.
  - Upgrade: pull these three guards into your project's matching files
    (or copy from the template). After this you can `pnpm build` with
    no `.env` at all; pass real env vars at runtime.

- **chore(deploy): rewrite Dockerfile, add Procfile, drop `prod.docker-compose.yml`**
  - `Dockerfile` — was a monorepo studio Dockerfile (copied workspace
    files, `apps/studio` paths). Replaced with a single-package SvelteKit
    Dockerfile suited to scaffolded projects: pnpm + corepack, separate
    install/build layers for caching, `pnpm prune --prod`, no required
    build-args (since builds no longer need env).
  - `Procfile` (new) — `web: node build` for canine.sh / Heroku /
    buildpack-style Node deploys. One-line.
  - `prod.docker-compose.yml` (deleted) — bundled postgres + studio +
    cloudflared in one stack but referenced monorepo paths
    (`context: ../..`) so it didn't work standalone. If you want
    multi-service compose, write your own — the new `Dockerfile` is the
    only piece you'd reference from it.
  - Upgrade: copy the new `Dockerfile` + `Procfile`, delete your
    `prod.docker-compose.yml` if you have one (or fix it to use
    `context: .`/`dockerfile: Dockerfile`).

- **fix(dev): replace fragile schema-HMR plugin with restart-on-change**
  - `src/hooks.server.ts` — removed the `__aphexSchemasDirty` global flag
    check, the cache-busting dynamic import (`?t=${Date.now()}`), and the
    "config not ready during HMR" retry. The hook now statically imports
    `aphex.config` at module load and calls `createCMSHook(cmsConfig)` once.
    On schema change the dev server restarts, so the whole module
    re-evaluates fresh — no race conditions, no stale module instances.
  - Why: the previous module-graph invalidation approach raced with parallel
    requests, missed deeply-imported schemas (object types referenced by
    other schemas), and could leak module instances via the cache-bust query
    param. Restart-on-change costs ~1s but always picks up the change.
  - Upgrade: simplify `src/hooks.server.ts` to statically import the config
    and create the hook once at module load (see template diff).

- **chore(vite): consolidate cms-core boilerplate into `aphex()` plugin**
  - `vite.config.ts` shrinks from ~90 lines to ~7. The new `aphex()` export
    from `@aphexcms/cms-core/vite` bundles: schema HMR, dayjs ESM alias,
    `ssr.noExternal`/`external` defaults, `optimizeDeps` tuning, and
    workspace watcher un-ignore — everything that was previously copy-pasted
    into every consumer of cms-core.
  - Each piece is opt-out via `aphex({ hmr: false, dayjs: false, … })` if
    you need to override.
  - Why: future cms-core upgrades that change Vite requirements (e.g. new
    transitive dep that needs pre-bundling) become a cms-core-only change
    instead of a coordinated update across every consuming project.
  - Upgrade: replace the bulk of `vite.config.ts` with a single `aphex()`
    call (see template diff). Keep app-specific config (e.g. `server.fs.allow`,
    custom proxies, env vars) at the top level.

## 0.0.4
- pass authorised origins from .env into better auth  to handle csrf
- preload dayjs for better UX when going into a fresh studio
- disallow admins from changing themselves to owners and kicking out original owners

## 0.0.3
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
