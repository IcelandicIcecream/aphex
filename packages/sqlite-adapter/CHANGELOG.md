# @aphexcms/sqlite-adapter

## 0.2.0

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

- Updated dependencies [[`9dfa05c`](https://github.com/IcelandicIcecream/aphex/commit/9dfa05ca15289eb7a13ec06b6785ad8b132b8492), [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66), [`9dfa05c`](https://github.com/IcelandicIcecream/aphex/commit/9dfa05ca15289eb7a13ec06b6785ad8b132b8492), [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66), [`741bca7`](https://github.com/IcelandicIcecream/aphex/commit/741bca7f1fcc292becf6c1e4d3e4b6acd8f5dc66)]:
  - @aphexcms/cms-core@9.5.0

## 0.1.0

### Minor Changes

- Initial release. New SQLite database adapter built on libsql: local `file:` databases (zero infra — no Docker, no server) and Turso-hosted `libsql://` URLs with the same adapter. A first-class alternative to the PostgreSQL adapter, not a reduced tier. Implements the full `DatabaseAdapter` interface with the same explicit organization-scoped WHERE filtering the PostgreSQL adapter uses; document JSON filters/sorts run through SQLite's `json_extract`.

  When the adapter creates the client from `url`, it applies recommended pragmas (WAL, `synchronous=NORMAL`, `busy_timeout=5000`) to local `file:` databases automatically — configurable via `pragmas: false` (opt out), a typed options object (`{ cacheSize, mmapSize, tempStore, busyTimeout, synchronous, journalMode }` merged over the recommended base), or a raw string of statements run verbatim. Apps that build their own client can call the exported `applyRecommendedPragmas(client, url, options?)` helper.

  SQLite has no Row-Level Security; organization isolation comes from the explicit `organizationId` WHERE clauses every query applies — the same mechanism that actually isolates tenants on pooled Postgres. `multiTenancy.enableHierarchy` works as on Postgres; there is no `enableRLS` option.

  Both adapters run the same cross-dialect conformance suite (`tests/conformance.spec.ts`) against an in-memory libsql and an in-memory PGlite, so filters, sorting, versioning, references, and org isolation behave identically. One documented difference: `contains` uses SQLite's `LIKE`, which is case-insensitive for ASCII only, where Postgres `ILIKE` handles full Unicode.
