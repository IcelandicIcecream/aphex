# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AphexCMS is a Sanity-inspired, database-agnostic CMS built with SvelteKit V2 (Svelte 5). It uses a monorepo managed by pnpm workspaces and Turborepo.

## Common Commands

Standard scripts (`dev`, `build`, `format`, `lint`, `check`, `db:*`) are in the root and `apps/studio` `package.json` — read those rather than duplicating them here. A few non-obvious ones:

- `pnpm test:package` — build + type-check `cms-core` (not just a test run).
- `pnpm -F @aphexcms/studio test:local | test:http | test:graphql` — run only the Local API / HTTP / GraphQL suites (all suites: `test`).
- `pnpm shadcn <component-name>` — add a shadcn-svelte component to `@aphexcms/ui`.
- `./scripts/sync-template.sh [--apply]` — sync studio → template (dry run without `--apply`); see the `sync-template` skill.

## Syncing studio → template → CLI

The studio → template → `create-aphex` sync workflow (and how the `aphx` CLI relates) lives in the **`sync-template` skill** — invoke it when syncing `apps/studio` downstream to `templates/base`, cutting a template release, or editing the CLI.

## Architecture

### Monorepo Layout

- **apps/studio** — Reference SvelteKit app (the actual CMS admin). Contains schema definitions, auth setup, DB/storage singletons, and API route re-exports.
- **packages/cms-core** — Database-agnostic core engine. Contains admin UI components, route handlers, field validation, schema utilities, plugin system, and TypeScript types. Exports via `@aphexcms/cms-core`, `@aphexcms/cms-core/server`, `@aphexcms/cms-core/client`, `@aphexcms/cms-core/schema`.
- **packages/postgresql-adapter** — PostgreSQL implementation using Drizzle ORM. Also exports `/pglite` (embedded Postgres).
- **packages/sqlite-adapter** — SQLite implementation via libsql (local `file:` databases and Turso). A first-class alternative to Postgres, not a reduced tier; both run the same cross-dialect conformance suite (`packages/sqlite-adapter/tests/conformance.spec.ts`).
- **packages/storage-s3** — S3-compatible storage adapter (R2, AWS S3, MinIO).
- **packages/ui** — Shared shadcn-svelte component library (`@aphexcms/ui`). Components imported as `@aphexcms/ui/shadcn/<component>`.
- **packages/cli, packages/create-aphex** — CLI tooling for scaffolding.
- **packages/nodemailer-adapter** — Nodemailer/SMTP email adapter (includes `createMailpitAdapter()` for local dev).
- **packages/resend-adapter** — Resend API email adapter (production).
- **templates/base** — Starter project template for new AphexCMS projects.

### Key Architecture Patterns

**Ports & Adapters (Hexagonal):** `cms-core` defines interfaces (`DatabaseAdapter`, `StorageAdapter`, `AuthProvider`); separate packages provide implementations. This keeps the core database-agnostic.

**Route Handler Re-exports:** API routes are defined in `cms-core/src/routes/` and re-exported in `apps/studio/src/routes/api/`. This avoids duplication while allowing customization.

**Singleton DI via Config:** The app creates singleton adapters (DB, storage, auth) and passes them to `createCMSConfig()` in `aphex.config.ts`. The `createCMSHook()` in `hooks.server.ts` initializes the CMS engine and injects services into `event.locals.aphexCMS`.

**Schema System:** Content schemas are TypeScript objects defined in `apps/studio/src/lib/schemaTypes/`. Two types: `document` (top-level entities) and `object` (reusable nested structures). Field types: `string`, `text`, `number`, `boolean`, `slug`, `url`, `image`, `file`, `array`, `object`, `reference`, `date`, `datetime`.

Two authoring styles, both valid:

- `const x: SchemaType = { ... }` — plain annotated object.
- `defineType({ ... })` — an **optional** wrapper (`@aphexcms/cms-core`) that captures the exact `fields` literal via a `const` type parameter, so lifecycle hooks get a `data` typed **by self-reflection from the schema's own fields** — no generated types, no casts. Backwards compatible: plain objects keep working; `defineType` only adds the typed-hook ergonomics. Inferred field values are `T | undefined` (a write may carry a subset).

**Schema hooks & validation (transform vs reject vs react):** A schema may declare `hooks.beforeValidate: DocumentHook[]` — save-time functions that run on every write path (Local API `create`/`update`, including the admin UI) **before** field validation. Hooks are **transform-only**: normalize/derive input and return the new data (the one thing validation can't do — it judges, never mutates). Keep the three concerns separate:

- **Transform** (normalize, slugify, stamp, default) → `hooks.beforeValidate`.
- **Reject** (required, format, cross-field invariants like "unique names") → `validation: (Rule) => Rule.custom(...)` — never a hook.
- **React** (email, webhook, cache) → a domain-event consumer, out of band — never a hook.

This bright line ("hooks transform, never react") is deliberate: it takes the one useful idea from Payload-style hooks while avoiding the mess of side-effects running inside the write path. Runner: `packages/cms-core/src/lib/local-api/hooks.ts`; types + `InferFields`/`FieldTSType`: `packages/cms-core/src/lib/types/schemas.ts`; helper: `packages/cms-core/src/lib/schema-utils/define-type.ts`.

**Block Content (Rich Text):** Rich text follows Sanity's Portable Text model — an array of blocks, not a standalone field type. Schema: `{ type: 'array', of: [{type: 'block'}, ...] }`. The `block` type is a built-in that activates the TipTap-based Portable Text editor. Configuration follows Sanity's conventions:

```ts
{
  name: 'content',
  type: 'array',
  title: 'Content',
  of: [
    {
      type: 'block',
      // All optional — sensible defaults if omitted
      styles: [{title: 'Normal', value: 'normal'}, {title: 'H1', value: 'h1'}, ...],
      lists: [{title: 'Bullet', value: 'bullet'}, {title: 'Number', value: 'number'}],
      marks: {
        decorators: [{title: 'Bold', value: 'strong'}, {title: 'Italic', value: 'em'}],
        annotations: [
          { name: 'internalLink', title: 'Internal Link', fields: [...] }
        ]
      },
      of: [
        // Inline objects — appear within text flow (e.g. footnotes, mentions)
        { type: 'footnote', title: 'Footnote', fields: [...] }
      ]
    },
    // Block-level custom types — siblings of block, appear between paragraphs
    { type: 'image', title: 'Image' },  // Built-in: opens asset browser
    { type: 'callout', title: 'Callout', fields: [...] },
    { type: 'codeBlock', title: 'Code Block', fields: [...] }
  ],
  validation: (Rule) => Rule.required()
}
```

Key points:

- `block` is never created manually — the editor manages text blocks automatically
- `image` is a built-in block type with asset browser integration (insert + replace)
- Other custom types use ObjectModal for editing
- Inline objects (`block.of`) render as chips within text; block-level types render as cards between paragraphs
- Validation works via the standard `Rule` class since block content is a regular array
- Stored as Portable Text JSON (spec: portabletext.org)
- Serializer: `packages/cms-core/src/lib/components/admin/fields/richtext/portable-text-serializer.ts`
- Editor: `packages/cms-core/src/lib/components/admin/fields/richtext/RichtextField.svelte`
- `ArrayField.svelte` detects `{type: 'block'}` in `of` and delegates to `RichtextField`

**Document Workflow:** Draft/published model with hash-based change detection. Auto-save every 2 seconds. Publishing copies draft data to published data with a content hash. **Scheduled publish/unpublish**: `localAPI.collections.<type>.schedulePublish(ctx, id, runAt)` (and `scheduleUnpublish`) enqueue a durable job on the queue (below); the worker runs the actual publish at `runAt`, re-validating and emitting `document.published`. Permission is checked at schedule time. At most one pending schedule per document (rescheduling cancels the prior). Editor UI: `ScheduleDialog.svelte`; the pending schedule shows as a banner in `DocumentEditor.svelte`.

**API Contracts (Zod):** All cms-core API endpoints use zod as a single source of truth for request shapes. Schemas live in `packages/cms-core/src/lib/api/schemas/<resource>.ts` and are imported by both the route handler and the client (`packages/cms-core/src/lib/api/<resource>.ts`). Route handlers validate via `safeParse` and return `{ success: false, error, issues }` with status 400 on failure; clients consume `z.infer<>` request types so input shapes can't drift. For query strings use `Object.fromEntries(url.searchParams.entries())` + `z.coerce.number()`. Keep hand-written TS interfaces for **response** types (e.g. `Asset`, `Organization`) — zod `.passthrough()` adds an index signature that breaks strict assignment for callers. Studio routes import schemas via `@aphexcms/cms-core/api/schemas/<resource>` (the package's `./*` export wildcard). Skip schemas for GET-only endpoints and no-body POST/DELETE (publish, accept-invitation, etc).

**Email System:** Ports & adapters pattern — `cms-core` defines the `EmailAdapter` interface (`send()`, optional `sendBatch()`), with Nodemailer and Resend implementations in separate packages. Email templates are Svelte 5 components using `better-svelte-email`, rendered server-side via a shared `Renderer` to email-safe HTML with Tailwind support. Templates live in each app at `src/lib/server/email/components/` (EmailLayout, PasswordReset, EmailVerification, Invitation). The renderer at `src/lib/server/email/renderer.ts` produces both HTML and plain text (`toPlainText()`). Three email types: password reset, email verification, and organization invitation. Dev uses Mailpit (localhost:1025, UI at localhost:8025); prod uses Resend. Emails are sent via Better Auth callbacks (auth flows) and fire-and-forget in route handlers (invitations). The adapter is injected via `createCMSConfig()` and available at `event.locals.aphexCMS.emailAdapter`.

**Event, Queue & Job System (the durable "react to facts" spine):** The leg the architecture reserved for reactions — the CLAUDE rule is **hooks transform, events react** (a hook mutates input in the write path; a consumer reacts out of band). Four parts, all DB-backed and organization-scoped, defined as ports in `packages/cms-core/src/lib/db/interfaces/events.ts` and implemented by the relational adapters:

- **`cms_domain_events`** — an **immutable, append-only** log of facts (`document.published`, …). Written via `appendEvent`, typically inside the same `withTransaction` as the state change that caused it (transactional outbox), so a fact never exists without its change nor is lost if the change committed.
- **`cms_event_outbox`** — a **mutable worklist** written in that same transaction, mirroring each event. Claimed by **status** (`processed_at IS NULL`), never by log position — so a late-committing event with an early timestamp isn't skipped (the bug a cursor-scan over the log would have). `event_type`/`payload` are denormalized for join-free fan-out.
- **`cms_jobs`** — a **work queue** with leases, exponential backoff + jitter, dead-lettering, and a unique `(org, idempotencyKey)`. Lifecycle: `pending → leased → completed/failed/cancelled`. A crashed worker's lease expires and the job is reclaimed. At-least-once, so **handlers must be idempotent**.
- **The relay** (`jobs/relay.ts`) turns facts into work: drains the outbox, and for each **subscribed consumer** enqueues one delivery job, then marks the row processed. **No lease** — at-least-once relay + idempotent enqueue (key `evt:<eventId>:<consumerId>`) = exactly-once delivery per (event, consumer). A delivery **is a job** (reserved type `aphex/consumer:<id>`), so consumers inherit all the retry/backoff/dead-letter machinery — no separate deliveries table.

Flow: `publish() → domain event + outbox row (one txn) → [worker tick] relay fans out → delivery job per consumer → runner invokes consumer → retry/dead-letter`.

**Running it — one seam, three modes.** `runJobsBatch(services, opts)` (`jobs/run-batch.ts`) is the single place the handler map is assembled (core built-ins → plugin `aphex/event/consumer` deliveries → plugin `aphex/job/handler` → app `config.jobs.handlers`, last wins) and one tick runs: **relay first, then execute** (so a just-published doc's consumers can fire the same tick). It's driven by the protected endpoint `POST /api/internal/workers/run`, gated by a shared secret (`config.jobs.workerSecret`; 404 when unset, so it's never an unauthenticated surface). Three ways to drive that endpoint: **platform cron** (hosted), the **self-hosted poll loop** (`apps/studio/scripts/worker.ts`, `pnpm -F @aphexcms/studio worker`), and (planned) an **embedded in-process loop** that calls `runJobsBatch` directly. The runner never loops itself — the caller sets cadence; each call is bounded by `config.jobs.batchSize`/`relayBatchSize`.

**Emitting & subscribing.** Events are typed via `defineEvent(type, zodSchema)` (`events/catalog.ts`); emitters `parse` the payload so a bad shape fails at the write site. Built-in `document.published` is emitted by the shared `emitDocumentPublished` helper (`events/emit.ts`) on **every** publish path — versioned or not, from the admin UI, Local API, REST, GraphQL, MCP, or a scheduled job — because all publishes bottom out at `collection-api`. Two plugin part kinds close the loop (`plugins/types.ts`):

- **`aphex/event/consumer`** — `{ id, events: [...], handler, maxAttempts? }`. React to an event durably. The handler gets `{ event, databaseAdapter, logger, settings }`, where `settings.get(pluginId)` returns the plugin's **decrypted** per-org settings (e.g. a webhook URL `secret`) — so a plugin that declares an `aphex/settings` part can read its own config inside a reaction. Throw to retry.
- **`aphex/job/handler`** — `{ handlers: { <type>: JobHandler } }`. Register executors for jobs the plugin (or app) enqueues directly via `databaseAdapter.scheduleJob`.

A plugin that emits an event from a route, subscribes to it, and registers the handler is fully self-contained — **no wiring in the app's `aphex.config.ts`**. Example: `apps/studio/src/lib/plugins/notify-plugin.ts` (a Discord/Slack publish notifier). Keep event/job/consumer type strings package-namespaced to avoid collisions. **Do not** put side effects in schema hooks — that's what consumers are for.

### Key Files

- `apps/studio/aphex.config.ts` — CMS configuration (schemas, DB, storage, auth, plugins)
- `apps/studio/src/hooks.server.ts` — CMS initialization via `sequence(authHook, aphexHook)`
- `apps/studio/src/lib/server/db/index.ts` — Driver selection. Picks one adapter from `db/adapters/` based on `APHEX_DATABASE` (`sqlite` | `pglite` | default postgres) and re-exports `{ client, drizzleDb, dbDialect, db }`.
- `apps/studio/src/lib/server/db/adapters/` — One encapsulated factory per driver (`postgres.ts`, `pglite.ts`, `sqlite.ts`), each owning its client, Drizzle instance, migrations, schema, and dialect, and returning a `DatabaseBundle`. Switching databases is a single change in `index.ts`.
- `apps/studio/src/lib/server/db/auth-schema/` — Auth provider tables, split by dialect (`pg.ts`, `sqlite.ts`); the barrel re-exports `pg` as the default.
- `apps/studio/src/lib/server/auth/` — Auth provider integration and AuthProvider
- `apps/studio/src/lib/server/auth/auth.config.ts` — App-owned auth options (e.g. `requireEmailVerification`, off by default; opt in with `AUTH_REQUIRE_EMAIL_VERIFICATION=true`)
- `packages/cms-core/src/engine.ts` — CMSEngine class (orchestrator)
- `packages/cms-core/src/hooks.ts` — SvelteKit hook factory
- `packages/cms-core/src/routes-exports.ts` — Barrel file for route handler exports
- `packages/cms-core/src/components/admin/` — Admin UI components (Svelte 5)
- `packages/cms-core/src/components/admin/SchemaField.svelte` — Dynamic field renderer
- `packages/postgresql-adapter/src/schema.ts` — Drizzle database schema (includes `cms_domain_events`, `cms_event_outbox`, `cms_jobs`; sqlite mirrors it in `packages/sqlite-adapter/src/schema.ts`)
- `packages/cms-core/src/lib/db/interfaces/events.ts` — `EventJobAdapter` port: `appendEvent` (writes event + outbox row), `listUnprocessedOutbox`/`markOutboxProcessed`, `scheduleJob`/`claimDueJobs`/`completeJob`/`retryJob`/`failJob`
- `packages/cms-core/src/lib/events/` — event catalog (`defineEvent`, `catalog.ts`), the emit helper (`emit.ts`), and the consumer bridge (`consumer.ts` — context, delivery-envelope parse, `aphex/consumer:<id>` job type)
- `packages/cms-core/src/lib/jobs/` — `run-due-jobs.ts` (the pure claim→run→settle engine + backoff policy), `relay.ts` (outbox fan-out), `run-batch.ts` (`runJobsBatch` — the shared relay+run seam), `document-jobs.ts` (scheduled publish/unpublish handlers)
- `packages/cms-core/src/lib/server/api/routes/workers-run.ts` — protected `POST /api/internal/workers/run` (Bearer `jobs.workerSecret`); `apps/studio/scripts/worker.ts` — the self-hosted poll loop that calls it
- `apps/studio/src/lib/plugins/notify-plugin.ts` — example `aphex/event/consumer` + `aphex/settings` plugin (publish → Discord/Slack webhook), the reference for self-contained event-driven plugins
- `apps/studio/src/lib/server/email/` — Email adapter selection, config, renderer, and Svelte email components
- `apps/studio/src/lib/server/auth/better-auth/instance.ts` — Better Auth setup (sends password reset & verification emails)
- `packages/cms-core/src/lib/email/interfaces/email.ts` — EmailAdapter interface & types

## Code Conventions

- **Svelte 5 runes**: Use `$state`, `$derived`, `$effect` — not Svelte 3/4 `$:` syntax.
- **Commit messages**: Conventional Commits format (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`).
- **Naming**: `kebab-case.ts` files, `PascalCase.svelte` components, `camelCase` variables/functions, `PascalCase` types/interfaces.
- **Imports**: Use `import type` for type-only imports.
- **Barrel files** (`index.ts`): keep them **super thin — re-exports only, no mixed concerns** — primarily to **keep bundle chunk sizes down.** Rollup's download unit is the chunk, not the symbol: when a barrel re-exports both light and heavy modules, importing _anything_ from it can pull the heavy modules into the same shared chunk, so every page that touches the barrel ships code it never uses (this is what forced the `@aphexcms/cms-core/client` → `/client/ui` split — a fat barrel dragged the TipTap/field-editor chunk onto every admin page). So: a barrel only re-exports from siblings (`export * from './x'`), never declares logic or implementations inline, and **groups by weight** — keep heavy, rarely-needed exports out of a barrel that light/hot paths import (give them their own narrow entrypoint). See `packages/cms-core/src/lib/schema-utils/index.ts`.
- **UI components**: Import from `@aphexcms/ui/shadcn/<component>`. Add new ones via `pnpm shadcn <name>`.
- **Styling**: Tailwind CSS v4 with shared CSS variables in `packages/ui/src/lib/app.css`.

## Environment Setup

- Copy `apps/studio/.env.example` to `apps/studio/.env` for local dev (defaults work).
- First user to sign up at `/login` becomes super admin.
- Admin UI is at `http://localhost:5173/admin`.
