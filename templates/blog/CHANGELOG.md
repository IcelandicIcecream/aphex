---
**Heads up:** This project was scaffolded from `@aphexcms/blog`.
When upgrading, read `CHANGELOG.md` in the template repo for notes on
what changed upstream and which files you may want to port into your
customized project.
---

# AphexCMS Blog Template Changelog

Notes for users upgrading an existing project scaffolded from this template.
Because the template is meant to be customized, changes here are **not**
automatically applied to your project — this file describes what changed
upstream so you can cherry-pick the bits you care about.

Format: each entry lists the files touched and a one-line reason. Use
`git diff` against the mirror repo (`IcelandicIcecream/aphex-blog`) at the
tag matching the version you started from to see the exact changes.

## Unreleased

- **Fix: the first-run seed's "background it on Vercel" fix never actually engaged — it was still blocking every request.**
  - `package.json` — adds `@vercel/functions`.
  - `src/hooks.server.ts` — `seedHook` now imports `waitUntil` from `@vercel/functions` and
    gates on `env.VERCEL`, instead of checking `event.platform?.context?.waitUntil`.
  - `src/app.d.ts` — removes the `Platform.context.waitUntil` type augmentation; nothing
    ever populated it.
  - **Why:** verified live — after fixing the boot-migration hang/crash, sign-up finally
    got through, but the seed still never completed ("it doesn't even run the seed").
    `event.platform.context.waitUntil` is a Vercel **Edge Functions** shape (and deprecated
    even there per Vercel's own docs) — this app runs as a standard Node.js serverless
    function, where `event.platform.context` is never populated at all. So the earlier fix's
    `if (waitUntil)` check was always false in production, silently falling through to the
    blocking `await seedOnFirstRun(...)` path the whole time — the exact thing it was
    supposed to prevent. `@vercel/functions`'s `waitUntil` is the actual supported primitive:
    it reads Vercel's request context directly (via its own async context tracking, not
    `event.platform`), works the same regardless of runtime, and no-ops harmlessly outside
    Vercel.

- **Fix: the `55P03` lock-timeout error added below could itself crash the process instead of surfacing its friendly message.**
  - `src/lib/server/db/adapters/postgres.ts` — the error-code check now reads
    `error.code` in addition to `error.cause?.code`, and the advisory-lock release in
    `finally` only runs if the lock was actually acquired.
  - **Why:** verified live — the previous fix's `55P03` handling never matched, because
    a `PostgresError` thrown directly by `migrationClient.unsafe()` (the lock-acquire
    statement itself) sets `.code` straight on the error object, not under `.cause` —
    `.cause` only shows up on errors that bubble through drizzle's `dialect.migrate()`.
    The raw `PostgresError` escaped uncaught and crashed the Node process outright
    ("Node.js process exited with exit status: 1"), instead of the intended clear
    message. This also confirms the theory below is real: the lock-acquire statement
    genuinely tripped the 15s `lock_timeout`, meaning something was actually holding
    the advisory lock, not just a slow connection. Also stopped the unconditional
    `pg_advisory_unlock` in `finally` from firing when the lock was never acquired
    (harmless, but logged a spurious "you don't own a lock" warning every time).

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
  - **Why:** seeding downloads 11 Unsplash images and uploads each one to storage —
    comfortably past a serverless function's execution limit. Verified live: the
    triggering request took ~1m47s end-to-end on Vercel and was flaky right at the
    timeout boundary (sometimes a very slow 200, sometimes a 500). The page now renders
    immediately (empty until the background seed finishes, then populated on refresh)
    instead of the request itself hanging or failing.

- **`README.md`'s "Deploy to Vercel" button now targets the `aphex-blog` mirror directly**
  (no `root-directory`), instead of this monorepo with `root-directory=templates/blog`.
  A standalone repo with a real `package.json` (no `workspace:*` deps) is a strictly simpler
  Vercel build than a `root-directory` slice of a pnpm-workspace monorepo — one less variable
  when diagnosing a deploy that isn't working.

- **Postgres as a second DB dialect + Vercel Blob storage — one-click Vercel deploy, README fix.**
  - `src/lib/server/db/` restructured to mirror studio's driver-selection pattern:
    `adapters/{types,sqlite,postgres}.ts` (one factory per driver), `auth-schema/{index,pg,sqlite}.ts`
    (was a single flat `auth-schema.ts`), `cms-schema.ts` now re-exports the Postgres-dialect
    tables (canonical typing for the raw Drizzle handle, same as studio), and a new
    `schema.sqlite.ts` barrel for the SQLite `drizzle-kit` CLI target.
  - `adapters/sqlite.ts` pushes the schema on boot (no migration files, unchanged from before).
    `adapters/postgres.ts` applies versioned migrations from `drizzle-pg/` instead — drizzle-kit's
    `pushSchema` API doesn't work against the postgres-js driver as of drizzle-kit@0.31.7 (its
    internal introspection wrapper reads `result.rows`, but postgres-js's `db.execute()` resolves
    to the row array directly, so it crashes reading `.map` off `undefined`). The migration SQL is
    pulled in via a static `import.meta.glob(..., { query: '?raw' })`/JSON import rather than read
    from disk at runtime, and applied through the same dialect-level primitive `drizzle-orm`'s own
    migrator uses internally — see the "Fix: Postgres boot-migration silently missing on Vercel"
    entry in `templates/base`'s changelog for why (same root cause, same fix, ported here since
    this dialect is new to the blog template).
  - `src/lib/server/db/index.ts` — **SQLite (libsql) stays the default** (a local `file:`
    database, zero infra), but now auto-switches to Postgres when `DATABASE_URL` looks like
    one (e.g. `postgres://...`) or `APHEX_DATABASE=postgres` is set explicitly — mirrors the
    `aphex migrate` CLI's own dialect-detection rule. Also falls back to
    `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` (Vercel's Turso Cloud marketplace integration) for
    the SQLite path.
  - `src/lib/server/auth/better-auth/instance.ts` / `instance.ts` — `createAuthInstance` now
    takes a `provider: 'pg' | 'sqlite'` argument (defaulting to `'sqlite'`) threaded into
    Better Auth's `drizzleAdapter`, and reads `VERCEL_PROJECT_PRODUCTION_URL`/`VERCEL_URL` as a
    fallback for the auth URL/trusted origins when `AUTH_URL`/`BETTER_AUTH_URL` isn't set.
  - `package.json` — adds `@aphexcms/postgresql-adapter`, `postgres`, and
    `@aphexcms/storage-vercel-blob`.
  - `drizzle.config.ts` — same dialect auto-detection; the Postgres branch outputs to
    `./drizzle-pg` so `db:generate` doesn't collide with the SQLite migrations folder.
  - `src/lib/server/storage/index.ts` — auto-selects Vercel Blob when `BLOB_READ_WRITE_TOKEN`
    is present (checked before the existing R2/S3 and local-filesystem fallback).
  - `.env.example` — documents `BLOB_READ_WRITE_TOKEN`, the Postgres/Neon option, and the
    Turso Cloud fallback.
  - `README.md` — adds a "Deploy to Vercel" button (auto-provisions a Neon database + a Blob
    store, same as `templates/base`), and fixes the mirror-repo link that incorrectly pointed
    at `aphex-base` instead of `aphex-blog`.
  - **Why:** local filesystem storage and a local SQLite file both fail to persist on
    Vercel's serverless/read-only filesystem — the local DB case is worse, since a session can
    vanish between requests. Neon has a verified, zero-manual-signup auto-provisioning flow
    (the same `products` deploy-button trick as `templates/base`); Turso's didn't have a
    confirmable one, so Postgres became the better default for the Vercel path specifically —
    without disturbing the zero-infra SQLite story for local dev and self-hosting (Docker,
    Fly, Railway), which stays exactly as it was.

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

- **Demo content seeds itself on first run.** A fresh scaffold now boots with
  three posts, two pages, authors, tags, and site settings instead of an empty
  site, so the public templates have something to render immediately.
  - `src/lib/server/seed/index.ts` — **new.** The demo content set (Portable
    Text posts, Unsplash covers stored as real assets) plus `seedOnFirstRun`,
    which fires only when the first organization exists and holds zero rows of
    any seeded type — it can populate exactly one moment in a site's life and
    never touches anything a person made. Kill switch: `APHEX_SEED=false`, or
    delete the directory and its hook.
  - `src/hooks.server.ts` — adds the `seedHook` to the handle sequence.
  - `src/routes/api/seed-blog/+server.ts` — **new.** Dev-only reset button:
    wipes seeded-type documents and recreates the demo set.
  - The demo content exercises every block type — embeds, galleries, toggles,
    dividers, and buttons alongside the existing callouts, code, and images —
    and fills in the home hero, template, and brand color.

- **Button blocks accept site-internal URLs.**
  - `src/lib/components/render/Button.svelte` — the `javascript:`-blocking URL
    check ran everything through `new URL()`, which throws on relative paths, so
    a button linking to `/about` silently rendered nothing. Root-relative paths
    now pass; `javascript:` and protocol-relative `//host` are still rejected.

- **Rich-text blocks now match Ghost's card set.** Five new block types plus a
  shared schema module, and the renderers moved out of `$lib/blog/`.
  - `src/lib/schemaTypes/objects/blocks.ts` — **new.** Shared card schemas
    (`callout`, `codeBlock`, `embed`, `toggle`, `divider`, `button`, `gallery`),
    each with a `preview` config. Previously `callout`/`codeBlock` were declared
    inline in each document.
  - `src/lib/schemaTypes/blogPost.ts`, `src/lib/schemaTypes/page.ts` — import the
    shared cards instead of inlining two of them; both gain all seven.
  - `src/lib/components/render/` — **new home** for the Portable Text renderers,
    renamed off the `Blog*` prefix (`Callout.svelte`, `CodeBlock.svelte`,
    `Image.svelte`, `CodeStyle.svelte`, `LinkMark.svelte`, `Prose.svelte`) plus new
    `Embed`, `Toggle`, `Divider`, `Button`, `Gallery`. They render for pages too,
    not just the blog, so they no longer live under `$lib/blog/`.
  - `src/lib/components/studio/EmbedPreview.svelte` — **new.** Inline editor preview
    so a pasted embed renders as the real iframe while writing.
  - `src/lib/components/embed.ts` — **new.** Shared iframe-`src` parsing used by both
    the renderer and the editor preview, so they can't drift. Never renders pasted
    HTML — it extracts the `src` and emits its own iframe.
  - `src/lib/blog/` — now holds only blog-specific pieces (`PostCard`, `Seo`,
    `authors`, `tags`, `seo`, `reading-time`). **Delete your old `Blog*.svelte`**
    and repoint `Prose` imports at `$lib/components/render/Prose.svelte`.
- **Swappable site shells.** `src/lib/site/templates/` — pick a front-end shell
  (Editorial Journal, Minimal Index, Brutalist Ledger) from site settings.
  - `shells.css` introduces `--bleed-width`, bounding how wide full-bleed blocks
    (image/gallery/code) may grow. Shells that offset the article — Minimal Index has
    a fixed rail — set it to `100%`, otherwise breakouts overflow the layout.
- `src/lib/plugins.ts` — **new.** Client-safe plugin registry (SEO + colour picker);
  `aphex.config.ts` imports the same array.
- `src/routes/(protected)/admin/settings/plugins/+page.svelte` — **new.** Per-org
  plugin settings tab (requires the `plugin.settings.manage` capability).
- `src/routes/robots.txt/`, `src/routes/sitemap.xml/` — **new.** Sitemap covers
  `blog_post`, `page`, `tag`, and `author`.

- `src/routes/(protected)/admin/settings/+layout.svelte` — settings pages now use the horizontal tab layout directly under the title and description.
- **Blog template now runs on SQLite (libsql) instead of Postgres/pglite — zero-infra by default.**
  - `src/lib/server/db/index.ts` — libsql client (`file:.aphex/blog.db` default, Turso via `DATABASE_URL=libsql://…` + `DATABASE_AUTH_TOKEN`), auto-migrates on boot, `createSQLiteProvider` from the new `@aphexcms/sqlite-adapter`.
  - `src/lib/server/db/cms-schema.ts` — re-exports from `@aphexcms/sqlite-adapter/schema`.
  - `src/lib/server/db/auth-schema.ts` — rewritten with `drizzle-orm/sqlite-core` (integer timestamps/booleans).
  - `src/lib/server/auth/better-auth/instance.ts` — drizzle adapter `provider: 'sqlite'`, `LibSQLDatabase` type.
  - `drizzle.config.ts` — `dialect: 'sqlite'`; `drizzle/` migrations regenerated for SQLite.
  - `package.json` — swaps `@aphexcms/postgresql-adapter`/`postgres`/`@electric-sql/pglite` for `@aphexcms/sqlite-adapter`/`@libsql/client`; drops `db:start`/`db:delete`.
  - `docker-compose.yml` — Postgres service removed (Mailpit stays); `.env.example`/`README.md` updated for the zero-docker quickstart. Want Postgres? Mirror the base template's DB wiring.
- **`aphex migrate` — runtime-safe migrations (fixes migrate-in-production).**
  - `package.json` — adds a `migrate` script (`aphex migrate`). Use this to apply migrations on prod; unlike `db:migrate` (drizzle-kit, a devDependency stripped from the prod image), it works at runtime via `drizzle-orm`. Also supports pglite.
  - `Dockerfile` — the runtime `CMD` now runs `aphex migrate && node build`, so the container applies pending migrations on start (idempotent). Multi-instance deploys should instead run `aphex migrate` once as a pre-deploy step and revert `CMD` to `node build`.
- **Auto type-generation in dev (no file changes needed — just bump `@aphexcms/cms-core`).** The `aphex()` plugin already in your `vite.config.ts` now watches `src/lib/schemaTypes/**` and regenerates `src/lib/generated-types.ts` on save — drop the manual `pnpm generate:types` from your dev loop. Keep committing `generated-types.ts`; builds/CI/prod use it as-is (no `generate:types` needed on prod). The script stays for catch-up / CI-drift-check cases.
- **New field UIs via `@aphexcms/cms-core` + `@aphexcms/ui` bumps (no template file changes):** `number` fields support `options.layout: 'slider'` (+ `unit`); `string` fields support `options.layout: 'tabs'` with per-item `icon` (segmented/alignment-style pickers). Also includes richtext link-popover/caret fixes and a brand-orange focus ring.
- `vite.config.ts` — fixed plugin order (`sveltekit()` before `tailwindcss()`) to prevent Tailwind v4.2+ from crashing on Svelte virtual CSS modules in node_modules
- `src/lib/server/email/**` — email template and adapter updates
- `src/routes/(protected)/admin/+layout.server.ts` — admin layout server updates
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
