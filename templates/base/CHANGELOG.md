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

- **Fix: boot migration could hang for the full ~300s until Vercel force-killed the function.**
  - `src/lib/server/db/adapters/postgres.ts` — the migration connection now sets
    `connect_timeout: 10`, and the advisory lock acquisition is wrapped in a
    `SET lock_timeout = '15s'` / `SET lock_timeout = 0` pair (bounding only the lock
    wait, not the migration's own DDL). A `55P03` (`lock_not_available`) failure now
    gets a clear explanatory error. `migrationClient.end()` also gets a 5s timeout.
  - **Why:** verified live — a request hung for the full ~300s Vercel function timeout
    with zero application-level error logged, and a _completely unrelated_ route hung
    for the identical duration, pointing at the one thing both share: `db/index.ts`'s
    module-level init on a cold start. `pg_advisory_lock` blocks indefinitely by
    design; serverless functions can be frozen between invocations rather than cleanly
    terminated, so a connection that acquired the lock and never reached its `finally`
    (frozen mid-migration) leaves it orphaned — every future boot's blocking call then
    queues behind a lock that will never free until Postgres notices the dead
    connection on its own. Bounding the wait turns a silent 5-minute hang into a fast,
    clear, loggable error.

- **Vercel Runtime Cache adapter — a cache that actually caches something on Vercel.**
  - `package.json` — adds `@aphexcms/cache-vercel-runtime`.
  - `src/lib/server/cache/index.ts` — selects it when the `VERCEL` system env var is
    set, ahead of the existing in-process `InMemoryCacheAdapter`.
  - **Why:** a plain in-process `Map` is nearly useless as a cache on serverless —
    each function instance has its own private memory, wiped on every cold start, so
    most requests land on an instance that never cached anything. Vercel Runtime Cache
    (https://vercel.com/docs/caching/runtime-cache) is shared across instances within
    a region instead — same zero-infra story (no Redis/Upstash to provision), but
    actually effective there. It has no native "list/delete by prefix" or "flush all"
    though (only exact-key get/set/delete plus tag-based invalidation) — the adapter
    tags every entry with each `:`-delimited ancestor of its key so `invalidateByPrefix`
    can map onto `expireTag`, which covers cms-core's actual (small, fixed) set of
    prefixes (`hierarchy:`, `roles:<org>:`, `query:<org>:<collection>:`).

- **Serverless-sized Postgres connection pool on Vercel.**
  - `src/lib/server/db/adapters/postgres.ts` — new `poolMax` option (defaults to the
    existing 50).
  - `src/lib/server/db/index.ts` — passes `poolMax: 1` when `VERCEL` is set.
  - **Why:** 50 connections per instance is sized for a long-running Node/Docker
    process serving many concurrent requests. On serverless, each function instance
    handles requests essentially one at a time — concurrency comes from _more
    instances_, not a bigger pool per instance — and Neon's connection string is
    already pooled (PgBouncer). A large per-instance pool just adds cold-start
    connection-setup time and risks exhausting Neon's total connection budget when
    several instances scale out at once.

- **Fix: first-run demo-content seed could time out (or just take ~2 minutes) on Vercel.**
  - `src/hooks.server.ts`'s `seedHook` — when `event.platform?.context?.waitUntil` is
    available (set by `@sveltejs/adapter-vercel`), the seed now runs through it instead
    of being `await`ed inline, so it continues in the background after the response is
    sent rather than holding the request open. Falls back to the previous blocking
    `await` when it's not available (self-hosted Docker/Node, no per-request timeout
    to worry about there).
  - `src/app.d.ts` — adds the `Platform.context.waitUntil` type.
  - **Why:** seeding downloads a dozen-odd Unsplash images and uploads each one to
    storage — comfortably past a serverless function's execution limit. Verified live:
    the triggering request took ~1m47s end-to-end on Vercel and was flaky right at the
    timeout boundary (sometimes a very slow 200, sometimes a 500). The page now renders
    immediately (empty until the background seed finishes, then populated on refresh)
    instead of the request itself hanging or failing.

- **`README.md`'s "Deploy to Vercel" button now targets the `aphex-base` mirror directly**
  (no `root-directory`), instead of this monorepo with `root-directory=templates/base`.
  A standalone repo with a real `package.json` (no `workspace:*` deps) is a strictly simpler
  Vercel build than a `root-directory` slice of a pnpm-workspace monorepo — one less variable
  when diagnosing a deploy that isn't working.

- **Fix: Postgres boot-migration silently missing on Vercel.**
  - `src/lib/server/db/adapters/postgres.ts` — the migration SQL (`drizzle/*.sql` - `drizzle/meta/_journal.json`) is now pulled in via a static `import.meta.glob(...,
{ query: '?raw' })`/JSON import instead of read from disk at runtime
    (`fs.readFileSync(resolve('drizzle'))`), and applied through the same
    dialect-level primitive `drizzle-orm`'s own migrator uses internally.
  - **Why:** Vercel's SvelteKit adapter decides what ships with the serverless
    function via `@vercel/nft`, a _static_ import-graph tracer. A migrations folder
    only ever touched through `fs` at runtime has no import for it to see, so it's
    silently absent from the deployed function — the boot migration would throw
    (or worse, silently find nothing) on a fresh Vercel deploy. A real import
    guarantees the SQL travels with the compiled bundle regardless of platform.

- **Vercel Blob storage support — zero-config storage when deployed on Vercel.**
  - `package.json` — adds `@aphexcms/storage-vercel-blob` dependency.
  - `src/lib/server/storage/index.ts` — auto-selects Vercel Blob when `BLOB_READ_WRITE_TOKEN`
    is present (checked before the existing R2/S3 and local-filesystem fallback).
  - `src/lib/server/auth/better-auth/instance.ts` — falls back to Vercel's
    `VERCEL_PROJECT_PRODUCTION_URL`/`VERCEL_URL` system env vars for the auth URL/trusted
    origins when `AUTH_URL`/`BETTER_AUTH_URL` isn't set, so a Vercel deploy doesn't need it
    filled in manually.
  - `.env.example` — documents `BLOB_READ_WRITE_TOKEN`.
  - **Why:** local filesystem storage doesn't persist on Vercel's serverless/read-only
    filesystem. Vercel Blob can be auto-provisioned during project creation (including via a
    "Deploy to Vercel" button using the `stores` query param), so this makes a from-scratch
    Vercel deploy of a scaffolded project actually work without hand-configuring R2/S3.

- **Vite 8 + `vite-plugin-svelte` 7 — fixes a build-breaking regression.**
  - `package.json` — `vite` `^7.3.3` → `^8.1.5`, `@sveltejs/vite-plugin-svelte` `^6.2.1` →
    `^7.0.0`, `@tailwindcss/vite` + `tailwindcss` `^4.1.17` → `^4.3.0`.
  - **Why:** `@sveltejs/vite-plugin-svelte@6.2.4` (which the old `^6.2.1` range resolved to on
    a fresh install) drops the version query from the virtual CSS import it emits. The CSS
    loader then looks the module up by unversioned filename, misses the compiled CSS, and
    falls through to the raw `.svelte` file — so PostCSS tries to parse `<script>` as CSS and
    the build dies with `@tailwindcss/vite: Invalid declaration: onMount, onDestroy`. The 7.x
    line fixes it, and requires Vite 8 as a peer; `@tailwindcss/vite` gained Vite 8 support in
    `4.3.0`.
  - **If you're on an older scaffold and hit that error**, this is the fix — port the four
    version bumps above. Every Vite-touching dep in the template already supports Vite 8
    (`@sveltejs/kit`, `adapter-node`, `vitest`, `@tailwindcss/vite`); if you've added your own
    Vite plugins, check them before bumping. Staying on Vite 7 also works as long as you pin
    `@sveltejs/vite-plugin-svelte` to a pre-`6.2.4` version.

- **Full sync with studio: plugin system, capability catalog, multi-driver DB, first-run seed.**
  - Admin/settings pages (roles, members, api-keys, organizations, account, login) — synced with
    studio's reworked versions. The roles editor now renders the server-resolved capability
    catalog (core + plugin-declared capabilities) instead of a hardcoded list; `owner`'s
    capabilities are locked (the server reconciles them on boot and rejects edits).
  - `src/lib/plugins.ts` — **new.** Client-safe plugin registry, imported by both
    `aphex.config.ts` (server engine) and the admin page (widgets). Starts empty.
  - `src/lib/server/db/` — studio's multi-driver layout: one encapsulated factory per driver
    (`adapters/postgres.ts`, `adapters/pglite.ts`, `adapters/sqlite.ts`), selected via
    `APHEX_DATABASE` (default postgres). Auth schema split by dialect under `auth-schema/`.
    Postgres/pglite now **auto-migrate on boot** (advisory-locked); opt out with
    `APHEX_DB_AUTO_MIGRATE=false` if you manage the schema with `db:push`.
  - `drizzle/` — migrations squashed to a single `0000` baseline (includes the new
    `cms_plugin_settings` table). Fresh scaffolds only; if you have an existing database
    migrated under the old files, baseline its journal or recreate it.
  - `src/lib/server/seed/` — **new.** First-run seed: on the first boot against an untouched
    site (first org exists, zero documents) it creates one example page. Kill switch:
    `APHEX_SEED=false`, or delete the directory and the `seedHook` in `hooks.server.ts`.
  - `src/lib/server/auth/auth.config.ts` — **new.** App-owned auth options
    (`AUTH_REQUIRE_EMAIL_VERIFICATION`, off by default).
  - `package.json` — gains `@aphexcms/sqlite-adapter` + `@libsql/client` (the sqlite driver
    option); `generate:types` now passes `./src/lib/plugins.ts` so plugin field types
    desugar during codegen.

- `src/app.css` — (1) added `@source '../node_modules/@aphexcms/plugin-*/dist/**'` so Tailwind generates styles for any installed `@aphexcms/plugin-*` widget (e.g. the color-picker's saturation square). Tailwind v4 ignores `node_modules` by default, so this line is required when you use plugins. (2) Added refined thin scrollbars (pointer devices only) in place of the chunky native ones.
- `src/routes/(protected)/admin/settings/+layout.svelte` — settings pages now use the horizontal tab layout directly under the title and description.
- **`aphex migrate` — runtime-safe migrations (fixes migrate-in-production).**
  - `package.json` — adds a `migrate` script (`aphex migrate`). Use this to apply migrations on prod; unlike `db:migrate` (drizzle-kit, a devDependency stripped from the prod image), it works at runtime via `drizzle-orm`. Also supports pglite.
  - `Dockerfile` — the runtime `CMD` now runs `aphex migrate && node build`, so the container applies pending migrations on start (idempotent). Multi-instance deploys should instead run `aphex migrate` once as a pre-deploy step and revert `CMD` to `node build`.
- **Auto type-generation in dev (no file changes needed — just bump `@aphexcms/cms-core`).** The `aphex()` plugin already in your `vite.config.ts` now watches `src/lib/schemaTypes/**` and regenerates `src/lib/generated-types.ts` on save — drop the manual `pnpm generate:types` from your dev loop. Keep committing `generated-types.ts`; builds/CI/prod use it as-is (no `generate:types` needed on prod). The script stays for catch-up / CI-drift-check cases.
- **New field UIs via `@aphexcms/cms-core` + `@aphexcms/ui` bumps (no template file changes):** `number` fields support `options.layout: 'slider'` (+ `unit`); `string` fields support `options.layout: 'tabs'` with per-item `icon` (segmented/alignment-style pickers). Also includes richtext link-popover/caret fixes and a brand-orange focus ring.
- `vite.config.ts` — fixed plugin order (`sveltekit()` before `tailwindcss()`) to prevent Tailwind v4.2+ from crashing on Svelte virtual CSS modules in node_modules
- `src/lib/server/email/**` — email template and adapter updates
- `src/routes/(protected)/admin/+layout.server.ts` — admin layout server updates; removed the dead `/blog` sidebar nav item (base template has no blog route)
- `src/routes/+page.svelte` — replaced the stock SvelteKit welcome page with a minimal landing page linking to `/admin`
- `package.json` — dependency updates

## 0.0.8

- Update deps

## 0.0.7

- **fix(version-and-reference-ui-bugs)**

## 0.0.5 & 0.0.6

- **feat(better-ref-fields): added better reference fields - more flexibility and better UI**
  - this includes a cms_reference table that keeps track of the indexes - for reference walking (back and front) - for UX and document publish guarding
- **feat(auth): resend verification email from the login page**
  - `src/routes/login/+page.svelte` — adds a "Resend verification email"
    action in two places: under the signup-success card, and inline with
    the "email not verified" error when signing in. Calls Better Auth's
    `authClient.sendVerificationEmail({ email })`, which fires the same
    `sendVerificationEmail` callback wired into `better-auth/instance.ts`.
    Includes a 60s client cooldown so accidental double-clicks don't fire
    duplicate sends.
  - `src/lib/server/auth/better-auth/instance.ts` — adds two layers of
    server-side abuse protection:
    1. Per-endpoint Better Auth `rateLimit.customRules`:
       `/send-verification-email` and `/forget-password` are capped at 2
       requests per 60s per IP (vs. the global 100/60s default).
    2. Per-email throttle inside `sendVerificationEmail`: refuses to send
       another verification email to the same address within 60 seconds
       even from a different IP, using `cacheAdapter` as the throttle
       store. Caps inbox-flood blast radius if an attacker rotates IPs.
  - Why: if the email adapter was misconfigured or down at signup time
    (e.g. mailpit not running), the original verification email was lost
    silently. Signing up again hits "user exists" and there was no UI
    path to re-trigger the email — leaving the account stranded.

- **fix(build): no more dummy `.env` required to `pnpm build`**
  - `src/lib/server/db/index.ts` — guards `pgConnectionUrl(env)` with
    SvelteKit's `building` flag, falling back to a placeholder URL during
    the build/analyze pass. postgres-js connects lazily, so the placeholder
    is never dialed.
  - `src/lib/server/email/index.ts` — uses the Mailpit adapter as a no-op
    stub when `building` is true so `RESEND_API_KEY` isn't required.
  - `src/lib/server/auth/better-auth/instance.ts` — supplies placeholder
    `secret` and `baseURL` during `building` so `betterAuth()` doesn't throw.
  - Why: SvelteKit's `vite build` runs an analyze worker that imports
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

- pass authorized origins from .env into better auth to handle csrf
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
