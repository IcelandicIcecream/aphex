---
**Heads up:** This project was scaffolded from `@aphexcms/website`.
When upgrading, read `CHANGELOG.md` in the template repo for notes on
what changed upstream and which files you may want to port into your
customized project.
---

# AphexCMS Website Template Changelog

Notes for users upgrading an existing project scaffolded from this template.
Because the template is meant to be customized, changes here are **not**
automatically applied to your project — this file describes what changed
upstream so you can cherry-pick the bits you care about.

Format: each entry lists the files touched and a one-line reason. Use
`git diff` against the mirror repo (`IcelandicIcecream/aphex-website`) at the
tag matching the version you started from to see the exact changes.

This file is maintained by hand. The website template is excluded from
changesets (`.changeset/config.json`), like the other templates — a changeset
describes a change to a published package, and a template is scaffolding you
copy and then own. Changes to `packages/*` still need a changeset.

The template's foundation — auth, database adapters, email, the studio routes —
comes from `@aphexcms/base`. Fixes that land there and are synced down are
recorded in that template's changelog, not repeated here.

## Unreleased

- **The default dev server now binds to loopback (`package.json`).** The previous bare
  `--host` flag could coexist with another SvelteKit app on the same numeric port by using
  a different address family, preventing Vite's normal next-port fallback. `pnpm dev` now
  advances to the next free localhost port; pass `--host` explicitly for LAN or tunnels.
- **`.env.example` now names the real consequence of a wrong `AUTH_URL`.** It said a bad
  value "sends people to the wrong host", which reads like an email-links problem to fix
  later. In fact Better Auth compares it against the request origin and declines on a
  mismatch, and the decline lands as a bare 404 from `/api/auth/*` — so the symptom is
  "sign-up does nothing", with nothing in the log naming the cause. The comment now calls
  out the two ways it happens on a fresh project (port 5173 taken, so Vite moved to 5174;
  or deployed while still pointing at localhost), and records that
  `AUTH_TRUSTED_ORIGINS` _replaces_ its default rather than extending it.
- **The seeded Aphex wordmark had an invisible ring.** The logo master is white artwork
  throughout — `fill="white"` on the glyph _and_ `stroke="white"` on the ring around it.
  The rasterised `seed/assets/logo.png` converted the fills to black but not the stroke, so
  the ring stayed white and disappeared against the page, leaving a wordmark whose glyph did
  not match the square `mark.png` beside it. Regenerated with every white reference
  recoloured on both `fill` and `stroke`.
- **`svelte.config.js` no longer ships the monorepo-only `@lib` alias.** It pointed at
  `../../packages/ui/src/lib` — correct inside the Aphex monorepo, where `@aphexcms/ui`
  resolves to workspace source whose components import each other through that alias, but
  meaningless in a scaffolded project, where the published package ships a `dist` with the
  alias already rewritten. There it resolved two directories above your project to a path
  that does not exist. It is now applied only when the monorepo is detected, matching how
  `server.fs.allow` is handled in `vite.config.ts`.
- **Seed assets moved to `src/lib/server/seed/assets/`.** They were read from
  `static/uploads/<uuid>/original.*` via a working-directory-relative path, so seeding only
  worked when the server happened to start from the project root. They now resolve relative
  to the seed module itself, and sit outside `static/` like every other upload.

- **Local uploads moved out of `static/` (`src/lib/server/storage/index.ts`).** The
  default was `./static/uploads`, and everything under `static/` is served publicly at
  the site root and copied into the build — so uploads were readable at
  `/uploads/<id>/original.jpg` with no session, defeating `private: true` (enforced only
  by `/media/:id/:filename`). The default is now `./uploads`. If you are on the default,
  run `mv static/uploads uploads`; stored URLs are unchanged. The local adapter now rebases
  legacy database paths from that former root to the current root while keeping arbitrary
  outside paths blocked. Deploys that set `APHEX_UPLOADS_DIR` were never affected.

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

- **The first-run seed now operates as a Digital World partner agency.** Pages, articles,
  categories, navigation, SEO, and the case-intake form use cohesive in-world copy while still
  exercising every template feature.

- **Transparent black organization logos remain visible in dark mode.** Logo uploads now record
  their image appearance, and the admin inverts only near-black marks with alpha transparency.

- **Initial website template.** A public content site built on the base
  template: pages assembled from a page builder (call-to-action, content,
  media and archive blocks), posts with rich text, categories, hero variants,
  header/footer/site-settings singletons, search, sitemap, SEO fields, live
  preview with click-to-edit, and a seeder that fills a fresh install with
  demo content.

- **A form builder, and a contact page that uses it.** `@aphexcms/plugin-forms`
  contributes `form` and `formSubmission` collections, a public
  `POST /api/form-submissions` endpoint and an out-of-band notification
  consumer; the template adds the **Form** page-builder block and renders it
  (`src/lib/blocks/FormBlock.svelte`). Editors compose fields — text, email,
  long text, select, checkbox, number, message — set the confirmation behaviour
  and the notification recipients, all without code. Submissions are validated
  server-side against the form's own fields using the same engine the admin
  uses, undeclared keys are dropped, and a honeypot plus per-IP rate limiting
  cover the obvious spam. The seed now creates a Contact form and a `/contact`
  page.
  Files: `src/lib/blocks/FormBlock.svelte`, `src/lib/server/forms.ts`,
  `src/lib/schemaTypes/objects/blocks.ts`, `src/lib/plugins.ts`,
  `src/lib/server/seed/index.ts`.

- **Fields that don't apply are now hidden rather than explained.** Uses
  cms-core's new `hidden` condition: a link shows its target document _or_ its
  custom URL, never both; the hero's media only appears for the variants that
  render one; the archive block shows either its query settings or its
  hand-picked selection. Every "only used when…" description is gone.
  The hero also gains an **Alignment** control (low impact only).
  Files: `src/lib/schemaTypes/fields/link.ts`,
  `src/lib/schemaTypes/fields/hero.ts`, `src/lib/schemaTypes/objects/blocks.ts`,
  `src/lib/heros/LowImpact.svelte`.

- **`POST /api/seed` now requires an operator secret outside development.**
  It deletes every page, post and category before rewriting the demo content,
  and was previously gated in production on "is anyone signed in" — which is
  not a permission. The handler runs under `systemContext` against
  `findAllOrganizations()[0]`, so it bypasses RBAC and ignores which
  organization the caller belongs to: **any authenticated user of any
  organization could have destroyed a different organization's content.** It
  now needs `SEED_SECRET`, sent as `Authorization: Bearer <secret>` and
  compared in constant time; with the variable unset the route 404s, so a
  default deploy exposes nothing. Give it its own value — not
  `APHEX_SECRET_ENCRYPTION_KEY` (which never leaves the server, while this one
  travels in a request header) and not the jobs worker secret (held by a cron
  platform, and only authorised to run due jobs).
  Files: `src/routes/api/seed/+server.ts`, `.env.example`.

- **The homepage no longer reports every failure as "no content".** Its `load`
  caught everything, so a database outage, a broken asset service or a failing
  archive query all rendered the onboarding screen — at HTTP 200, so uptime
  checks pass while every visitor is told the site is empty. Only `isHttpError`
  404s (no `home` document, no organization) are treated as not-yet-set-up now.
  Files: `src/routes/(site)/+page.server.ts`.

- **The favicon from site settings now applies to the public site**, not just
  the admin. The root layout's unconditional `<link rel="icon">` is gone —
  `app.html` already ships the default, so it was a third competing tag whose
  winner was left to the browser.
  Files: `src/routes/+layout.svelte`, `src/routes/(site)/+layout.svelte`.

- **`noIndex` documents are excluded from the sitemap.** A sitemap is an
  invitation; listing a URL and then serving `noindex` when the crawler arrives
  wastes crawl budget and surfaces as a Search Console coverage warning.
  Files: `src/routes/sitemap.xml/+server.ts`.

- **`robots.txt` moved from `static/` to a route** so its `Sitemap:` line is an
  absolute URL, filled in from the request. A relative sitemap reference is
  ignored by every major crawler, and a static file cannot know the host it
  will be served from — so this was not fixable in place. If you customized the
  old static file, port your rules into the handler.
  Files: `src/routes/robots.txt/+server.ts`, `static/robots.txt` (**deleted**).

### Known gaps

Worth knowing before you build on this, and not yet addressed:

- **No managed redirects.** Changing the slug of a published page or post
  breaks existing links immediately.
- **Category archives are filtered in memory**, capped at
  `FILTER_SCAN_CAP = 200` posts (`src/lib/server/posts.ts`) — a category page
  becomes incomplete beyond that.
- **The sitemap lists at most 1,000 pages and 1,000 posts.**
- **No template tests.**
