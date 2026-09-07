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

- **Local uploads moved out of `static/` (`src/lib/server/storage/index.ts`).** The
  default was `./static/uploads`, and everything under `static/` is served publicly at
  the site root and copied into the build — so uploads were readable at
  `/uploads/<id>/original.jpg` with no session, defeating `private: true` (enforced only
  by `/media/:id/:filename`). The default is now `./uploads`. If you are on the default,
  run `mv static/uploads uploads`; stored URLs are unchanged. Deploys that set
  `APHEX_UPLOADS_DIR` were never affected.

- **One-click deploy configs.** `render.yaml` and `railway.json` ship at the project root, and
  the READMEs carry Deploy to Render / Deploy on Railway buttons pointing at the mirror repo.
  Both provision a single container with a volume at `/data` holding the SQLite database and
  the uploads, so there is no database to set up. `docker-compose.prod.yml` covers the
  Coolify / Dokploy / VPS path.

- **`docker-entrypoint.sh` derives the public URL from the platform.** adapter-node builds
  `event.url` from its own host:port unless `ORIGIN` says otherwise, and Better Auth then
  refuses the request as an origin mismatch — which surfaces as a bare 404 on sign-up with
  nothing in the log naming the cause. The entrypoint fills `AUTH_URL`/`ORIGIN` from
  `RENDER_EXTERNAL_URL`, `RAILWAY_PUBLIC_DOMAIN`, `COOLIFY_URL`, `APP_URL` or `FLY_APP_NAME`
  when you have not set them, which is the only workable answer for a one-click deploy where
  the hostname does not exist until provisioning finishes. An explicit `AUTH_URL` always wins.

- **Fixed: the container could not boot on the template's own default database.** The image
  ran `aphex migrate` unconditionally, but that command reads `DATABASE_URL`/`APHEX_DATABASE`
  and cannot see `APHEX_SQLITE_URL` — so a SQLite deploy exited 1 with "No database
  configured" before the app started. Migrations now run only on the Postgres path; SQLite
  provisions its schema at startup and has no migration folder to apply. **Port this if you
  deploy the bundled `Dockerfile` on SQLite** — replace the `CMD` with the entrypoint.

- **`APHEX_UPLOADS_DIR` moves local file storage without touching code.**
  `src/lib/server/storage/index.ts` read a hardcoded `./static/uploads`, which is inside the
  image — so on any container host the media library emptied itself on every redeploy. Set it
  to a path on a mounted volume. Stored asset URLs are `/media/:id/:filename` and resolve
  through the adapter, so moving the directory rewrites nothing in the database, but it does
  not move existing files either: set it before the first upload.

- **`APHEX_EMBEDDED_WORKER=true` runs the job queue in-process in production.** `aphex.config.ts`
  previously enabled the embedded loop in dev only, so a single-container production deploy
  queued scheduled publishes and event consumers and never ran them — silently. Leave it off
  when running more than one replica and drive `POST /api/internal/workers/run` instead.

- **The runtime image is ~100MB smaller (563MB → 463MB) and no longer runs as root.** `pnpm prune --prod` alone leaves
  the build toolchain in place, because it is reachable from _production_ dependencies as
  peers: `bits-ui` and `better-auth` peer-depend on `@sveltejs/kit`, which peer-depends on
  vite (and rolldown) and typescript. The Dockerfile now removes those explicitly, along
  with sharp's unused glibc libvips (the image is Alpine, so only the musl build ever
  loads). **`@sveltejs/kit` itself is deliberately kept** — `cms-core` stays external to
  the server bundle and imports it at runtime, so removing it produces a container that
  builds and starts and then dies with `ERR_MODULE_NOT_FOUND`. If you extend the list,
  boot the image and load a page, not just `/healthz`.

- **The server process runs as `node` (uid 1000), not root.** A bare `USER` directive
  would break every volume-mounted deploy — platforms mount volumes owned by root, and a
  non-root process then fails with `EACCES` creating the SQLite file. `docker-entrypoint.sh`
  instead starts as root, chowns only the paths it writes, and hands off via `su-exec`. If
  the container is _started_ non-root (Kubernetes `runAsNonRoot`, `docker run --user`) it
  skips the chown and execs directly, so the image satisfies the `restricted` Pod Security
  Standard. Also adds a `HEALTHCHECK` to the image, so `docker run`, compose, Coolify and
  Dokploy all get real readiness; `docker-compose.prod.yml` inherits it instead of
  declaring its own.

- **`/healthz` reports database and storage adapter health.** `src/routes/healthz/+server.ts`,
  unauthenticated, 200 or 503. The deploy configs point their probes at it. The route is a
  thin wrapper over `checkHealth` from `@aphexcms/cms-core/server`, which bounds each check
  (a hung adapter reports unhealthy rather than hanging the probe) and treats a thrown check
  as unhealthy rather than a 500 — so the judgement improves with a cms-core bump while the
  HTTP shape stays yours to customize.

- **Transparent black organization logos remain visible in dark mode.** Logo uploads now record
  their image appearance, and the admin inverts only near-black marks with alpha transparency.

- **First-run content now includes Aphex branding.** The seed uploads the bundled wide wordmark
  and square mark through the configured asset service, uses the wordmark for the site logo and
  welcome-page cover, uses the square mark for the favicon, and defaults logo height to 40px.

- **Lucide icons are excluded from Vite dependency optimization.** This prevents HMR from
  deleting re-hashed icon chunks while the admin client is still requesting them.

- **The admin sidebar links to `Home` again.** Base keeps its `/` navigation item instead of
  inheriting studio's app-specific `/blog` link during template sync.

- **`pnpm db:push` now authenticates to Turso.** `drizzle.config.ts` selects drizzle-kit's
  `turso` dialect for `libsql://` URLs, because its `sqlite` dialect silently discards
  `DATABASE_AUTH_TOKEN` and receives a 401 from remote databases. The base config also defaults
  to SQLite, matching the application runtime, so local users do not need `APHEX_DATABASE`.

- **SQLite boot schema pushes are safe for existing and concurrent databases.**
  `src/lib/server/db/adapters/sqlite.ts` now selects missing tables by their `CREATE TABLE` target
  instead of substring matching (which mistook the new `two_factor` table for the existing
  `user.two_factor_enabled` column), and serializes schema inspection and updates. This prevents
  upgrades and concurrent dev-server/HMR initialization from failing with `table user already exists`.

- **Auth moved to `@aphexcms/auth`; two-factor, password change and account deletion added.**
  The template's hand-rolled better-auth instance and session/API-key service (~820 lines across
  `src/lib/server/auth/instance.ts`, `service.ts` and `better-auth/instance.ts`) were a copy of the
  package's, so every fix had to be made twice. Those three files are **deleted**; `auth/index.ts`
  is now ~50 lines of wiring around `createAphexAuth()`.
  - New: TOTP + emailed-code two-factor (`/two-factor`, `TwoFactorSettings.svelte`, the
    `two-factor-otp` email template), self-service password change and account deletion
    (`PasswordSettings.svelte`, `DeleteAccountSettings.svelte`, `DeleteOrganizationSettings.svelte`),
    and `PreferencesSettings.svelte`.
  - New: **sign-up bootstrap policies** in `auth/auth.config.ts` — `openFirstUser()` (the previous
    behaviour, still the default), `allowlistEmail()` via `APHEX_BOOTSTRAP_EMAIL`, or `claimCode()`
    via `APHEX_BOOTSTRAP_CLAIM_CODE=true`. Pick one before putting an instance on a public URL.
  - **If you customized any of the three deleted files**, port your changes onto the `options` /
    `bootstrap` arguments of `createAphexAuth()` rather than re-adding them.
  - New deps: `@aphexcms/auth`, `qrcode`.

- **`.env.example` rewritten.** Grouped into **required** (just `AUTH_SECRET`, with the command to
  generate it), **local defaults** (what the app already does with no configuration) and
  **optional** (commented blocks, one per feature). Three fixes worth knowing about:
  - `RESEND_API_KEY` is no longer pre-filled with a fake key. The old placeholder was _truthy_, so
    a production deploy built a live Resend client around a bad key and every password reset and
    invitation failed silently at send time. It is now commented out, and an unset key means email
    is disabled and says so at boot.
  - `BETTER_AUTH_SECRET` no longer ships a shared literal value — `AUTH_SECRET` is empty and must
    be generated. (`BETTER_AUTH_*` still works; `AUTH_*` is the preferred spelling.)
  - `APHEX_WORKER_SECRET`, `APHEX_ASSET_SIGNING_SECRET` and the bootstrap-policy vars are
    documented with what breaks while they're unset.

- **Site settings gained a `favicon` field**, used by both the public site and the admin browser
  tab (`(protected)/admin/+layout.server.ts` resolves it per organization).

- **Direct-to-storage uploads and signed private-asset URLs.** `aphex.config.ts` sets
  `upload: { direct: true, maxFileSize: 200MB }` so large files skip the app server (it falls back
  to a server-side upload when the storage adapter can't presign, e.g. local disk), and
  `security.assetSigningSecret` (`APHEX_ASSET_SIGNING_SECRET`) enables `signAssetUrl`.

- **`pnpm test` and friends removed from `package.json`.** They pointed at a `tests/` directory the
  template doesn't ship, so they failed on a fresh scaffold. `scripts/worker.ts` is now actually
  included, so `pnpm worker` works.

- **Fixes carried over from studio:** the admin layout redirects to `/login` instead of throwing
  when there's no session; `cms-schema.ts` re-exports the adapter schema with `export *` so a new
  table can't go missing; Postgres connections set `idle_in_transaction_session_timeout` (a hung
  transaction could permanently pin a pool connection); `drizzle.config.ts` points the SQLite
  branch at its own `out` folder so drizzle-kit stops reading Postgres snapshots and failing with
  a misleading "unsupported version" error.

- **Default database is now SQLite (was PGlite); PGlite removed.** The template runs on a local
  libsql file (`.aphex/base.db`, schema pushed on boot — no Docker, no migration step) out of the
  box. **Postgres is unchanged and one env var away** (`APHEX_DATABASE=postgres` + `DATABASE_URL`;
  migrations still in `drizzle/`) — see "Using Postgres instead" in the README. The PGlite adapter
  (`src/lib/server/db/adapters/pglite.ts`), the `@electric-sql/pglite` dependency, and the
  `APHEX_DATABASE=pglite` / `APHEX_PGLITE_DIR` env vars are gone.
  - Changed: `src/lib/server/db/index.ts` (driver selection defaults to SQLite), `.env` /
    `.env.example` (SQLite default, Postgres as a commented option), `package.json` (dropped
    `@electric-sql/pglite`), `drizzle.config.ts` + adapter comments (`base.db`).
  - **If you were on PGlite:** switch to `APHEX_DATABASE=postgres` (your data is Postgres-shaped —
    point `DATABASE_URL` at a real Postgres and `pnpm db:migrate`), or start fresh on SQLite.
  - The multi-adapter machinery stays, so switching databases remains a single env change.

- **New brand logo (theme-adaptive SVG).** `static/favicon.svg` and the inline `<svg>` in the
  login / invitations / god-mode pages now use the new Aphex mark — a single SVG that adapts to
  light/dark via an internal `prefers-color-scheme` media query (login/invite/god-mode use
  Tailwind `fill-black dark:fill-white` instead). If you've swapped in your own logo, ignore this.

- **Embedded dev job worker — no second terminal.** `aphex.config.ts` sets
  `jobs.embedded: dev`, so in `pnpm dev` the event/queue/job spine runs in-process (a ~3s
  in-memory tick) and you no longer need `pnpm worker` running alongside. In production the
  embedded loop is off — drive `POST /api/internal/workers/run` from cron or the poll loop as
  before. Requires `APHEX_WORKER_SECRET` in `.env` (already in `.env.example`).

- **`/admin/activity` route + nav item.** Surfaces the domain-event log, outbox, and job queue
  in the admin. Port `src/routes/(protected)/admin/activity/` and the sidebar nav entry if you
  want it.

- **New shared sender module `src/lib/email-sender.ts`.** One source of truth for the outbound
  `EMAIL_FROM` default, imported by both the server email config and the client-safe forms plugin
  registry (and the `aphex()` Vite plugin's Node loader). Because of that three-context reach it's
  a plain const with no env access. To override the sender per-environment, set `APHEX_EMAIL_FROM` —
  the **server-only** email config reads it via `$env/dynamic/private` and falls back to this
  default (auth emails only; the forms notification uses the const default). The default is a
  placeholder (`Acme <onboarding@example.com>`) — set it to your own verified sender before
  production. `.env.example` documents it. Note: with Resend the `from` domain must be verified.

- **Removed the dead `/blog` nav link** from the admin sidebar (and its `BookOpenText` import).

- **Squashed migration + `cms_plugin_storage`.** The template ships a single regenerated
  `drizzle/0000_*.sql` that now includes the generic plugin-storage table (data-plane sibling of
  `cms_plugin_settings`) plus the event/outbox/jobs tables. Fresh scaffolds migrate cleanly; if
  you're upgrading an existing project, `pnpm db:generate` against your own schema and review the
  diff rather than adopting this squashed file wholesale.

- **Bundle: repoint admin imports to narrow client barrels.** Admin routes/components now
  import from `@aphexcms/cms-core/client/ui` (admin chrome, no editor) and API-only pages
  from `@aphexcms/cms-core/client/api`, instead of the fat `@aphexcms/cms-core/client`
  barrel — which dragged the TipTap/field-editor chunk onto every admin page. Only
  `routes/(protected)/admin/+page.svelte` (the editor route, `AdminApp`) stays on `/client`.
  If you've customized these files, switch their `@aphexcms/cms-core/client` imports the
  same way (`/client/ui` for UI/API helpers, `/client/api` for API-only pages).

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
