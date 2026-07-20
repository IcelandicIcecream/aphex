# @aphexcms/cms-core

## 9.7.0

### Minor Changes

- [#284](https://github.com/IcelandicIcecream/aphex/pull/284) [`20b10c5`](https://github.com/IcelandicIcecream/aphex/commit/20b10c53987605fd8e3cb77156eb6b2753fed6d0) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add the durable event + job spine (Phase 1): an append-only domain-event log, a DB-backed job queue, and a transactional outbox — all cross-dialect (Postgres/pglite/SQLite).

  **cms-core**
  - `withTransaction` is now **required** on `DatabaseAdapter` (was optional). Both first-party adapters already implement it; this removes the non-atomic fallbacks in `VersionService`. Custom adapters must implement it.
  - New `EventJobAdapter` port on `DatabaseAdapter`: `appendEvent` / `getEvent` (append-only event log) and `scheduleJob` / `claimDueJobs` / `completeJob` / `retryJob` / `failJob` (job queue with leases + idempotency keys). Callable on the tx handle from `withTransaction`, so emitting an event or scheduling a job is atomic with the state change that caused it (transactional outbox).
  - `defineEvent(type, zodSchema)` — a typed event catalog helper (mirrors the API-contract pattern), plus the built-in `document.published` definition. New universal types: `DomainEvent`, `Job`, `AppendEventInput`, `ScheduleJobInput`, `ClaimJobsOptions`, etc.
  - `create({ publish })` is now atomic: create + draft snapshot + publish + publish snapshot commit in one transaction instead of four separate implicit ones. `document.published` is emitted inside the publish transaction on every versioned publish path.
  - **Job worker:** `runDueJobs()` — claims a bounded batch of due jobs, runs each type's registered handler, and settles it (complete / retry with exponential backoff + jitter / dead-letter after `maxAttempts`). Handlers and a shared `workerSecret` are configured via `CMSConfig.jobs`. A secret-gated `POST /api/internal/workers/run` endpoint drives one batch (404 when no secret is set, so it's never an unauthenticated surface by default); platform cron or a self-hosted poll loop calls it on a cadence.
  - **Scheduled publish/unpublish:** built-in `document.publish` / `document.unpublish` job handlers, plus `collection.schedulePublish()` / `scheduleUnpublish()` (Local API) and `POST /api/documents/:id/schedule`. Scheduling is permission-checked at schedule time; the job re-runs `publish()` at `runAt` (re-validating + guarding references), so invalid content fails/retries instead of publishing, and `document.published` is emitted on the scheduled path exactly like a manual publish. **Replace semantics**: scheduling replaces any existing pending schedule for the document (at most one → no accidental double-publish), and `runAt` is floored to the minute. The editor has a calendar+time schedule dialog and a banner under the title ("Scheduled to be published on Monday at 8:00 AM") with reschedule/cancel, backed by `GET`/`DELETE /api/documents/:id/schedule` and the adapter `cancelJob` method.
  - **Read-only history / observability:** `listEvents` / `listJobs` adapter methods + `GET /api/events` and `GET /api/jobs` (gated on `document.read`, paginated, filterable by type/status), surfaced in a top-level **Activity** admin view (`ActivityView`). Jobs and the domain-event log are queryable rows in your own DB — no external store.

  **postgresql-adapter / sqlite-adapter**
  - New `cms_domain_events` and `cms_jobs` tables (organization-scoped; RLS policies on Postgres, `WHERE`-based isolation on SQLite), and the `EventJobAdapter` implementation. **Requires a migration** on Postgres (`drizzle-kit generate` + `migrate`); SQLite picks the tables up via push-on-boot.

- [#284](https://github.com/IcelandicIcecream/aphex/pull/284) [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add an embedded in-process job runner (`config.jobs.embedded`) — a third way to
  drive the queue alongside platform cron and the self-hosted poll loop. It calls
  `runJobsBatch` on an interval from inside the running app (no HTTP endpoint, no
  worker secret), so scheduled publishes and event consumers run with zero setup.
  Ideal for local dev and single-instance self-hosting; ticks never overlap and a
  failing tick is logged and swallowed so the loop survives transient errors.

- [#284](https://github.com/IcelandicIcecream/aphex/pull/284) [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Event consumers now receive the configured `emailAdapter` in their context, so a
  consumer can send notifications (e.g. a form's "new submission" email) durably
  and out of band. `FormDefinition` also gains an optional `notifyEmail` for
  per-form notification routing.

- [#284](https://github.com/IcelandicIcecream/aphex/pull/284) [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add a generic plugin storage primitive — `cms_plugin_storage`, the data-plane
  sibling of `cms_plugin_settings`. Plugins persist arbitrary org-scoped JSON
  records namespaced by `(plugin, collection)` through the new
  `PluginStorageAdapter` port (`createPluginRecord` / `getPluginRecord` /
  `listPluginRecords`), implemented by both the PostgreSQL and SQLite adapters.
  `createPluginRecord` is callable on the `withTransaction` handle, so a record
  and the domain event announcing it commit atomically (transactional outbox).

### Patch Changes

- [#284](https://github.com/IcelandicIcecream/aphex/pull/284) [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - The `datetime` field validator now accepts canonical ISO-8601 (e.g.
  `new Date().toISOString()`) in addition to `YYYY-MM-DD HH:mm`, so a
  `beforeValidate` hook that stamps an ISO timestamp no longer fails validation.

- [#284](https://github.com/IcelandicIcecream/aphex/pull/284) [`8129e23`](https://github.com/IcelandicIcecream/aphex/commit/8129e237e9b2bd323c8eb36218238bbae1b1edf3) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Scheduling refinements. The schedule button now mirrors the Publish button's
  state (disabled when there are no unpublished changes), and a manual
  publish/unpublish cancels any pending **same-direction** scheduled job — so the
  queue can't fire a late duplicate and re-emit `document.published` /
  `document.unpublished`. An opposite-direction schedule is left intact.

## 9.6.0

### Minor Changes

- [#281](https://github.com/IcelandicIcecream/aphex/pull/281) [`3cab505`](https://github.com/IcelandicIcecream/aphex/commit/3cab505c0d471ef2f7ddc028bf0c6cbbe6116d08) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add a narrow `@aphexcms/cms-core/client/api` entrypoint that exports only the
  API client functions (no Svelte components). Importing anything from the main
  `@aphexcms/cms-core/client` barrel pulls the entire admin UI graph — including
  the TipTap rich-text editor and @dnd-kit — into that route's chunk (~1.18 MB
  min / 328 kB gzip), even for a page that only calls an API function.

  Non-breaking: the existing `/client` barrel is unchanged. Utility pages that
  only need the API (e.g. an invitations screen, god-mode) can repoint their
  import to `/client/api` to drop the editor bundle from that route:

  ```diff
  -import { invitations, organizations } from '@aphexcms/cms-core/client';
  +import { invitations, organizations } from '@aphexcms/cms-core/client/api';
  ```

- [#281](https://github.com/IcelandicIcecream/aphex/pull/281) [`c14d1c1`](https://github.com/IcelandicIcecream/aphex/commit/c14d1c19e5ad9303e74a291e8e62f081969237e3) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add a `@aphexcms/cms-core/client/ui` entrypoint: the admin chrome and context
  primitives (Sidebar, ConfirmDialog, permissions/schema/slots/nav contexts,
  PluginSettingsPanel, API client, toast) without the document editor or field
  widgets.

  The full `/client` barrel also re-exports DocumentEditor, SchemaField, AdminApp
  and every `*Field` component, which pull the field registry (+@dnd-kit, +lucide)
  into one chunk (~337 kB min / ~110 kB gzip). Because Rollup's download unit is
  the chunk, a page that only wants a Sidebar or a confirm dialog still downloaded
  that whole chunk just by sharing the barrel.

  Non-breaking: `/client` is unchanged. Admin pages that don't mount the editor
  (settings, members, roles, plugins, organizations, god-mode) can import from
  `/client/ui` to drop the field registry from their initial load. Only the route
  that mounts `AdminApp`/`DocumentEditor` needs the full `/client`.

  ```diff
  -import { Sidebar, ConfirmDialogHost, setPermissionsContext } from '@aphexcms/cms-core/client';
  +import { Sidebar, ConfirmDialogHost, setPermissionsContext } from '@aphexcms/cms-core/client/ui';
  ```

- [#281](https://github.com/IcelandicIcecream/aphex/pull/281) [`f898e3e`](https://github.com/IcelandicIcecream/aphex/commit/f898e3e092a2d948a996dfe0e567aefcfb118719) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add schema lifecycle hooks and a typed `defineType` authoring helper.
  - `hooks.beforeValidate` on a schema — save-time transform functions that run on every write path (Local API `create`/`update`, HTTP API, admin UI) before field validation. Use them to normalize or derive input (trim, slugify, stamp, default). Hooks are transform-only by design: rejection and cross-field invariants stay in `validation: (Rule) => Rule.custom(...)`, and side effects belong in domain-event consumers — never in a hook.
  - `defineType(schema)` — an optional, backwards-compatible wrapper that captures the exact `fields` literal via a `const` type parameter, so `beforeValidate` hooks receive a `data` typed by self-reflection from the schema's own fields — no generated types, no casts. Plain `const x: SchemaType = { ... }` objects keep working unchanged.
  - Cross-field validation: `validateDocumentData` now populates `context.document` (the whole document) for `Rule.custom((value, { document }) => ...)`, matching the `ValidationContext` type. The document is built internally from the data being validated, so callers no longer pass it redundantly.

### Patch Changes

- [#281](https://github.com/IcelandicIcecream/aphex/pull/281) [`f798ed3`](https://github.com/IcelandicIcecream/aphex/commit/f798ed3975c0279eb5ee99ba0af6a4490f190c7d) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Lazy-load the rich-text (TipTap) editor. `ArrayField` now dynamically imports
  `RichtextField` only when a field's `of` actually contains `{ type: 'block' }`,
  so the ProseMirror/TipTap bundle (~393 kB min / 122 kB gzip) is split into its
  own async chunk instead of riding in the shared admin chunk.

  Effect: every admin page that doesn't render a rich-text editor — settings,
  members, roles, api-keys, and document editors whose schema has no block field —
  no longer downloads TipTap up front. It loads on demand the first time a
  rich-text field is shown. No API or behaviour change.

## 9.5.2

### Patch Changes

- [`2cc2657`](https://github.com/IcelandicIcecream/aphex/commit/2cc2657e9be58d5709166cc2e19ebd9a73382447) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix `generate:types` failing on plugins that import named icons

  The esbuild stub that strips `@lucide/svelte` out of the type-generation
  bundle was an ESM module exporting only a default. esbuild validates ESM named
  imports against the target module's exports, so any plugin doing
  `import { Sparkles } from '@lucide/svelte'` — which `@aphexcms/plugin-seo` does
  — failed the bundle with:

      No matching export in "lucide-stub:@lucide/svelte" for import "Sparkles"

  The stub (and the `.svelte` component stub, which has the same problem) now
  emits CommonJS. Named imports off a CJS module are resolved as property access
  rather than statically validated, so every icon name works and yields
  `undefined` — which is what the existing `icon:` rewrite wants anyway.

## 9.5.1

### Patch Changes

- [#273](https://github.com/IcelandicIcecream/aphex/pull/273) [`2b66bd4`](https://github.com/IcelandicIcecream/aphex/commit/2b66bd42126e1dc8894d68dae3d4bb353657ddaf) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix broken build in consuming apps: `@aphexcms/cms-core` shipped `dist/mcp/tools.js` importing `../../cli/generate-types.js`, a path that escapes the `dist` tree and fails to resolve in any consuming app (`Could not resolve "../../cli/generate-types.js"`). The shared type-shape logic (`mapFieldTypeToTS`/`fieldWriteShape`, plus the `generateTypesFromConfig` wrapper) now lives in core at `src/lib/type-gen.ts`, so `lib` no longer reaches up into `src/cli`. The `aphex` CLI bin is unchanged and imports the logic from core.

## 9.5.0

### Minor Changes

- [#271](https://github.com/IcelandicIcecream/aphex/pull/271) [`9dfa05c`](https://github.com/IcelandicIcecream/aphex/commit/9dfa05ca15289eb7a13ec06b6785ad8b132b8492) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Plugin capabilities now reach owners, and settings honour their own gate

  Two gaps in how plugin-declared capabilities integrate with the role model.

  `owner` was seeded from `ALL_CAPABILITIES`, which is core-only, so an owner could not
  hold a capability declared by an installed plugin — leaving owner with strictly fewer
  permissions than an `admin`, who can be granted one through the roles UI. The engine
  now derives owner's set from the merged capability catalog (core built-ins plus every
  plugin-declared capability) and passes it to `seedBuiltinRoles`, which takes an
  optional `ownerCapabilities`. Because the boot reconcile re-seeds every org,
  installing or removing a plugin is enough to bring owners in line. New orgs seed the
  same way, so a freshly created org's owner isn't missing its plugins' capabilities
  until the next restart.

  `hasCapability` accepted only the closed core `Capability` union, so checking a
  plugin-declared capability didn't type-check. It now takes `Capability | (string &
{})`, keeping autocomplete for built-ins while admitting plugin ids.

  `SettingsPart.requiredCapabilities` was documented as a way to "gate a specific
  plugin's settings more tightly" but was read nowhere: every plugin's settings were
  reachable by anyone holding `plugin.settings.manage`. It is now enforced on both
  `GET /api/plugin-settings` (which filters declarations, so the admin panel hides what
  you can't manage) and `PUT /api/plugin-settings/:pluginId`. Reads were already masked,
  so the exposure this closes is write: overwriting the secrets of a plugin that asked
  for a narrower capability.

- [#271](https://github.com/IcelandicIcecream/aphex/pull/271) [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Plugin system: declare schemas, routes, capabilities and admin UI from a package

  `definePlugin` plus a discriminated-union `PluginPart` and a part resolver let a
  package contribute to the CMS without the app wiring each piece by hand. Parts
  cover schemas and schema transforms, server routes, capabilities, document
  actions, admin tools, field components, and settings.

  Parts split across two planes: serializable parts the server engine ingests via
  `aphex.config.ts`, and component parts the admin imports directly (they can't
  cross a SvelteKit `load`). A Vite plugin handles auto-discovery.

  `aphex/server/route` parts must declare `requiredCapabilities` — there is no
  default, because none is right for both a webhook receiver and an admin-only
  export. `['forms.export']` requires authentication plus those capabilities, `[]`
  requires only authentication, and `'public'` opts out of the gate entirely. The
  CMS enforces this at mount, before the handler runs, so a plugin route is never
  accidentally open: omitting the field doesn't type-check, and exposing a route to
  the internet is a word you have to write.

  Also adds a theme module (`theme/`) exporting tokens, schemes and derivation, and
  an `AdminArea` type for extending the admin shell.

  This is additive — existing configs keep working without declaring any plugins.

- [#271](https://github.com/IcelandicIcecream/aphex/pull/271) [`9dfa05c`](https://github.com/IcelandicIcecream/aphex/commit/9dfa05ca15289eb7a13ec06b6785ad8b132b8492) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Schema transforms no longer drop access control, validation, or groups

  `{ type: 'color' }` and `{ type: 'seo' }` are desugared into real object fields by a
  schema transform. Both transforms rebuilt the field from a hand-picked subset of its
  properties — `name`, `title`, `description`, `group` — which silently discarded
  everything else the author wrote. A field declared with `access` came out of the
  transform **unrestricted**; `validation` was dropped; and `group: ['design',
'general']` collapsed to just `'design'`.

  Adds `desugarFieldType` to cms-core, which owns the tree walk (nested objects, array
  members) and layers the authored field back over the built one, so preservation is
  the default rather than something each plugin re-implements and gets wrong. The
  builder declares only the shape it owns; `sugarKeys` names the properties that exist
  solely on the sugar type (color's `alpha`, which becomes `inputOptions.alpha`) so
  they don't survive onto the expanded field. A property added to `BaseField` later is
  carried through automatically.

  Both plugins now use it, which also removes the duplicated `groupOf`/`expandFields`/
  `expandMember` recursion from each of them.

- [#271](https://github.com/IcelandicIcecream/aphex/pull/271) [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Reconcile built-in roles on boot so `owner` picks up new capabilities

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

- [#271](https://github.com/IcelandicIcecream/aphex/pull/271) [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Per-organization plugin settings, with encrypted secrets

  A plugin declares its settings shape via an `aphex/settings` part; core renders
  the form, stores values per organization, and injects them into the plugin's
  server code. Storage is a generic `cms_plugin_settings` table keyed by
  (organization, plugin) — adding a plugin never means a migration.

  Fields typed `'secret'` are encrypted at rest with AES-256-GCM under a versioned
  `v1:iv:tag:ciphertext` envelope, so the key can be rotated later without
  guessing at old values. Set `APHEX_SECRET_ENCRYPTION_KEY` to enable them; saving
  a secret without it fails loudly rather than writing plaintext.

  Secrets never reach the browser: the API serves masked values, and the decrypting
  accessor is server-only. Submitting a blank or masked field leaves the stored
  secret untouched, so a round-trip through the form can't wipe it.

  `SecretField` is deliberately not part of `FieldTypeMap` — `Field` derives from
  that map, so adding it there would let `'secret'` leak into content schemas.
  Settings are config, not content.

  `SettingsField` is a narrow subset — `string`, `text`, `number`, `boolean` and
  `secret` — rather than the whole content `Field` union: that's exactly what the
  panel renders and the service validates, so a declaration can't promise a widget
  (an `image`, a `reference`) that would fall through to a bare text input and store
  nonsense.

  Submitted values are validated against the declaration on save, so plugin server
  code can trust what it's injected instead of re-guarding every read. A `number`
  field rejects `"3"`, a `string` with a `list` rejects an undeclared option, and an
  invalid patch is refused whole with a 400 and its issues rather than being applied
  in part.

  Gated behind a new `plugin.settings.manage` capability.

### Patch Changes

- Updated dependencies [[`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66)]:
  - @aphexcms/ui@0.8.3

## 9.4.0

### Minor Changes

- [#268](https://github.com/IcelandicIcecream/aphex/pull/268) [`440fee8`](https://github.com/IcelandicIcecream/aphex/commit/440fee81aaf3e154658ac8d58913ab7c903949bf) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - `aphex migrate` now supports SQLite (libsql) as a third driver alongside Postgres and pglite. Detection: `APHEX_DATABASE=sqlite` or a `DATABASE_URL` starting with `file:`/`libsql:`. Remote (Turso) databases use `DATABASE_AUTH_TOKEN`.

### Patch Changes

- [#270](https://github.com/IcelandicIcecream/aphex/pull/270) [`53f3209`](https://github.com/IcelandicIcecream/aphex/commit/53f32098b7f837263ef92a61208511569ad39654) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Sanitize schema names with hyphens in GraphQL identifiers. A schema type named `blog-post` produced an invalid GraphQL identifier, since the spec only permits `[_A-Za-z][_0-9A-Za-z]*`. Type, field, union, and object names are now normalized through shared `toPascalCase` / `toCamelCase` helpers (`src/lib/utils/string-case.ts`), which handle hyphens, underscores, and camelCase boundaries consistently across the GraphQL schema builder, the resolvers, and `generate-types`.

  Thanks [@ChristopherSO](https://github.com/ChristopherSO) — [#267](https://github.com/IcelandicIcecream/aphex/pull/267).

- [#268](https://github.com/IcelandicIcecream/aphex/pull/268) [`21dc2dc`](https://github.com/IcelandicIcecream/aphex/commit/21dc2dcd2c706870615de4017476562a8f40ffef) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Silence a Vite SSR warning from `generate-types`. The CLI dynamically imports the consumer's schema module by a path resolved at runtime, which Vite cannot statically analyze — the import is now marked `/* @vite-ignore */`, so pulling this file into a dev bundle no longer logs "The above dynamic import cannot be analyzed by Vite."

## 9.3.0

### Minor Changes

- [#262](https://github.com/IcelandicIcecream/aphex/pull/262) [`d4c5d6f`](https://github.com/IcelandicIcecream/aphex/commit/d4c5d6f95389a84ed4f04d3c81d7a931055da9e7) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add a built-in MCP server so coding agents (Claude Code, Cursor) can read and build content over an org-scoped API key. Ships with the package via a re-exportable SvelteKit route (`@aphexcms/cms-core/routes/mcp`) using the official `@modelcontextprotocol/sdk` over Streamable HTTP (`@hono/mcp`), plus a transport-agnostic tool registry (`buildContentTools`). Tools derive their schema/field-type knowledge from the real validators and run under the caller's RBAC + RLS scope. Also includes richtext/portable-text editor fixes.

## 9.2.2

### Patch Changes

- auto generate types via vite plugin & data normalization bug fix for richtext

## 9.2.1

### Patch Changes

- add visual editing

- Updated dependencies []:
  - @aphexcms/ui@0.8.1

## 9.2.0

### Minor Changes

- allow multi-line code for richtext

## 9.1.0

### Minor Changes

- Add rich text block

## 9.0.0

### Minor Changes

- [#244](https://github.com/IcelandicIcecream/aphex/pull/244) [`8d7c74a`](https://github.com/IcelandicIcecream/aphex/commit/8d7c74a4f0fe62cf18ae9c7c230bfb410ba9da01) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - security fixes + bug fixes 12/05/26

### Patch Changes

- [#243](https://github.com/IcelandicIcecream/aphex/pull/243) [`f07240b`](https://github.com/IcelandicIcecream/aphex/commit/f07240b08b2c5969002773e8eb64f779989db494) Thanks [@ChristopherSO](https://github.com/ChristopherSO)! - Fix the Vite dayjs ESM plugin alias on Windows by handling backslash-separated resolved paths.

- Updated dependencies [[`8d7c74a`](https://github.com/IcelandicIcecream/aphex/commit/8d7c74a4f0fe62cf18ae9c7c230bfb410ba9da01)]:
  - @aphexcms/ui@0.8.0

## 8.1.0

### Minor Changes

- fixed reference and version ui bug

## 8.0.0

### Minor Changes

- better reference fields !

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.7.0

## 7.0.0

### Minor Changes

- fix up weird issue with spaces in the name for the cdn

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.6.0

## 6.0.0

### Minor Changes

- FIXED UP MODAL SHITS>

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.5.0

## 5.1.0

### Minor Changes

- added a bunch of fixes

## 5.0.6

### Patch Changes

- Added vite plugin for HMR - upgradable

## 5.0.5

### Patch Changes

- add optimizations

## 5.0.4

### Patch Changes

- security and opptimization fixes

## 5.0.3

### Patch Changes

- Update to allow singleton support

## 5.0.2

### Patch Changes

- core minor — singleton schema flag, focus mode .. pg minor - minor — explicit id on createDocument

## 5.0.1

### Patch Changes

- UPDATE SMALL BUGS AND FIXED TYPE GENN"

## 5.0.0

### Minor Changes

- UPDATE TO STABLE-ISH. UPGRADA-EABLe vers

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.4.0

## 4.0.0

### Major Changes

- Fix up client exports

## 3.0.0

### Major Changes

- [`028a247`](https://github.com/IcelandicIcecream/aphex/commit/028a247f5ca5fa61105f975c93e4dedf836d1253) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - remove subpaths for .svelte

## 2.1.2

### Patch Changes

- fix weird import error

- Updated dependencies []:
  - @aphexcms/ui@0.3.4

## 2.1.1

### Patch Changes

- Add the `svelte` export condition to every subpath export (`./client`,
  `./server`, `./schema`, `./app-augment`, `./routes/*`, `./*`) so
  Vite/SvelteKit's Svelte plugin claims them and compiles the re-exported
  `.svelte` components. Without it, Node's plain ESM loader received raw
  `.svelte` files and threw `ERR_UNKNOWN_FILE_EXTENSION`.

## 2.1.0

### Minor Changes

- correct context.svelte export

## 2.0.12

### Patch Changes

- Fix ESM resolution for `schema-context.svelte` rune module (dist imports
  now emit `.svelte.js` extension).
- Confirm-dialog: use shadcn `<Button>` components and break long titles so
  long asset filenames no longer stretch the delete modal.
- DocumentEditor: vertically center the header top row (breadcrumb, auto-save,
  draft/published pills, ellipsis).
- DocumentEditor: autosave now compares against an initial-defaults snapshot,
  so unchecking a boolean triggers save and booleans with `initialValue: true`
  no longer auto-create the document on mount.

## 2.0.11

### Patch Changes

- UI Revamp + Flexible Schema

- Updated dependencies []:
  - @aphexcms/ui@0.3.3

## 2.0.10

### Patch Changes

- USE ZOD API. and couple of minor bug fixes

- Updated dependencies []:
  - @aphexcms/ui@0.3.2

## 2.0.9

### Patch Changes

- hmr fixes and ui fixes

- Updated dependencies []:
  - @aphexcms/ui@0.3.1

## 2.0.8

### Patch Changes

- remove version restoration restriction

## 2.0.7

### Patch Changes

- hotfix. export document version panel

## 2.0.6

### Patch Changes

- added versioning

## 2.0.5

### Patch Changes

- cache key creation works on nested items

## 2.0.4

### Patch Changes

- add in memory caching

## 2.0.3

### Patch Changes

- Fix DocumentEditor overflow scroll bug and update apiKeyClient import for better-auth v1.5.x

## 2.0.2

### Patch Changes

- pluralize instead of just appending s

## 2.0.1

### Patch Changes

- template fixers

## 2.0.0

### Minor Changes

- add github repo and publishConfig"

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.3.0

## 1.0.0

### Minor Changes

- Initial Changeset tracking

### Patch Changes

- Updated dependencies []:
  - @aphexcms/ui@0.2.0
