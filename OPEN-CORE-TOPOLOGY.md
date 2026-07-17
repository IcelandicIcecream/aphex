# Aphex — Open-Core Topology

> Where things live and why: the boundary between the open-source engine, the
> theme/plugin ecosystem, and the commercial cloud. Written to be reacted to and
> revised — it is a decision record, not a spec.

## Positioning (the one line that decides everything)

Aphex is an **embedded, code-first CMS with a business-data angle**: it lives
inside your SvelteKit app, the same app renders your content, and the durable
value is the _data engine_ (custom schemas, adapters, visual editing, MCP/RLS) —
not a bundled frontend. The market is **custom sites backed by real structured
data** (developers and agencies), with a non-developer/hosted tier layered on top.

Two competitors, two things we are deliberately _not_:

- Not **WordPress** — we don't own or opinionate your frontend; you do.
- Not **Shopify** — the primitive is _your data model_, not commerce.

Every boundary below falls out of that positioning.

## The three layers

| Layer                       | Repo                                        | License           | What it is                                                                                                                                        | Boundary test                                                                |
| --------------------------- | ------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Core primitives**         | this monorepo                               | OSS               | The engine: schema system, adapters, plugin system, visual-editing API, design tokens, generic route delegation                                   | _A developer building a fully bespoke site needs it_                         |
| **Theme & plugin packages** | this monorepo (+ community/3rd-party repos) | OSS or commercial | Packaged capability built ON the primitives: SEO, color-picker, and **themes** (schema + `ve.*` components + tokens)                              | _It's one concrete way to use the primitives, not the primitives themselves_ |
| **Aphex Cloud**             | separate **private** repo                   | proprietary       | The hosted, multi-tenant SaaS: control plane, provisioning, billing, managed adapters, dashboard, curated theme gallery, "customize without code" | _It's only meaningful because we run it_                                     |

The single decision rule: **"Would a developer self-hosting Aphex and building a
bespoke site need this?"** Yes → core. It's one way to use core → package.
Only meaningful because we host it → cloud.

## Layer 1 — Core primitives (OSS, this monorepo)

The theme-agnostic engine. Lives where it lives today:

- `packages/cms-core` — schema system, field validation, route handlers, plugin
  system, MCP server, admin UI, the visual-editing overlay contract.
- `packages/visual-editing` — the `ve.*` render-time API + overlay (stega, click-to-edit).
- `packages/postgresql-adapter`, `packages/sqlite-adapter`, `packages/storage-s3`,
  `packages/nodemailer-adapter`, `packages/resend-adapter` — the ports & adapters.
- `packages/ui` — shared component library.
- `packages/create-aphex`, `packages/cli`, `templates/base` — scaffolding.
- `apps/studio` — **reference/dogfood app, not the cloud app.** Where features land first.

What makes something a core primitive: it's useful even to a developer who never
touches a "theme." The token system, `ve.live`/`ve.edit`, schema injection, and
the generic path→document→component delegation all qualify. They are the substrate
everything else is built from.

## Layer 2 — Theme & plugin packages (OSS + commercial)

A plugin is a package that contributes through the existing `definePlugin` parts:
`aphex/schema`, `aphex/schema/transform`, `aphex/server/route`, `aphex/capabilities`,
`aphex/document/action`, `aphex/admin/tool`, `aphex/field/component`. Already proven
by `plugins/plugin-seo` and `plugins/plugin-color-picker`.

**A theme is just a plugin package** — schema + `ve.*` render components + design
tokens — surfaced through one thin new extension point (`aphex/theme`, see below).
It is _not_ a first-class concept baked into `cms-core`; it emerges from the
primitives. That keeps core unopinionated about the frontend (the whole point) and
lets themes be OSS (community) or commercial (first-party/premium) without moving
the boundary.

### The `aphex/theme` extension point (the only new core mechanism themes need)

A thin part, following the existing two-plane split (serializable server side +
component client side):

- **Server/serializable:** `id`, `name`, design `tokens` (feed `deriveThemeFields`/
  `deriveThemeVars`), the schema types it depends on, and a path→document routing
  resolver.
- **Client/component:** the shell + per-type render components (today's
  `SITE_TEMPLATES` shells are 80% of this shape already).

The app keeps a **small set of generic delegating routes** (a catch-all + a couple
of index routes) that resolve the active theme, load content for the path, render
the theme's component, and push preview data. Because the theme's components call
`ve.*`, **visual editing comes for free** — no per-theme overlay code.

## Layer 3 — Aphex Cloud (proprietary, separate private repo)

Only what's meaningful because _we_ run it:

- Control plane, tenant provisioning, billing, usage metering.
- **Managed adapters** — managed Postgres (RLS), managed object storage, managed
  auth/email — swapped in behind the same `cms-core` interfaces.
- The customer dashboard and the "pick a theme, customize without code" surface
  (the WordPress/Shopify-competitor experience for non-developers).
- Curated first-party/premium themes.

### Why the adapter seam makes this cheap

Aphex is already ports-and-adapters. The cloud does **not** fork the engine — it
supplies managed implementations of `DatabaseAdapter` / `StorageAdapter` /
`AuthProvider` / `EmailAdapter` and wraps a control plane around the _same_
`cms-core`. Most companies retrofit this seam years in; it exists now. Cloud =
"managed adapters + provisioning + billing + dashboard," not a rewrite.

## Repo strategy

- **Now:** everything stays in this monorepo. Do **not** split the cloud out before
  it exists — a premature cross-repo dance is pure friction. Keep package boundaries
  clean and cloud-consumable (they mostly are), build the theme system here as OSS,
  keep `apps/studio` as the reference app.
- **When the cloud starts:** new **private** repo, pull these packages in as
  published deps (or a git submodule early). OSS packages version/publish on their
  own cadence; cloud deploys continuously. This is the WordPress.org/.com, Ghost,
  Supabase, Sanity, Payload model.

## Open decisions to pin before the data model hardens

1. **Multi-tenancy depth.** Is a cloud tenant an _org_ in one shared DB (current
   orgs + RLS), or a _fully isolated database/deployment_ per customer? "Business
   data + custom schemas per customer" pushes toward stronger isolation
   (DB-per-tenant). The adapter seam supports either, but the schema/migration
   tooling must assume one. **Expensive to retrofit — decide early.**
2. **Path→document routing convention.** How a URL maps to a type + slug field, or
   whether each theme ships its own resolver. Needed before generic routes land.
3. **Theme distribution.** Do community themes install like `@aphexcms/plugin-*`
   (npm + Vite auto-discovery, which already works), and does the cloud gallery
   pull from the same registry or a curated one?

## Sequencing

- **Track A — preview substrate (do first):** draft-aware preview queries +
  refresh-on-return. Needed regardless of themes; unblocks correct live preview now
  and is what a theme's visual editing rides on.
- **Track B — theme north star (on top of A):** promote `SITE_TEMPLATES` into an
  `aphex/theme` plugin part and convert the three existing shells as the proof.
- **Later — cloud:** only once A/B are proven and the multi-tenancy decision (#1) is
  made.
