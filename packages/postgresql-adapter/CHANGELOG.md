# @aphexcms/postgresql-adapter

## 14.2.0

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

## 14.1.1

### Patch Changes

- [#268](https://github.com/IcelandicIcecream/aphex/pull/268) [`440fee8`](https://github.com/IcelandicIcecream/aphex/commit/440fee81aaf3e154658ac8d58913ab7c903949bf) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix JSONB `in`/`not_in` filters: drizzle expands an embedded array into a tuple, so the previous `= ANY((a, b))` was invalid Postgres (error 42809) — now emits a plain `IN (...)` list with correct empty-array semantics. Also normalize the raw-SQL result shape in `findAssetByIdGlobal` so it works on drivers that return `{ rows }` (pglite) as well as postgres-js. Both found by the new cross-dialect conformance suite.

- Updated dependencies [[`440fee8`](https://github.com/IcelandicIcecream/aphex/commit/440fee81aaf3e154658ac8d58913ab7c903949bf), [`53f3209`](https://github.com/IcelandicIcecream/aphex/commit/53f32098b7f837263ef92a61208511569ad39654), [`21dc2dc`](https://github.com/IcelandicIcecream/aphex/commit/21dc2dcd2c706870615de4017476562a8f40ffef)]:
  - @aphexcms/cms-core@9.4.0

## 14.1.0

### Minor Changes

- [#262](https://github.com/IcelandicIcecream/aphex/pull/262) [`d4c5d6f`](https://github.com/IcelandicIcecream/aphex/commit/d4c5d6f95389a84ed4f04d3c81d7a931055da9e7) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add PGlite corruption guards. New `createPgliteClient(dataDir?)` export returns an HMR-safe singleton (one instance per data dir per process, cached on `globalThis`) and registers a graceful-shutdown hook (`beforeExit`/`SIGINT`/`SIGTERM`) that closes PGlite cleanly. This prevents the double-open and mid-write corruption that PGlite (which lacks Postgres's WAL crash recovery) is prone to during dev HMR and process exits. `createPgliteProvider` uses the guarded client automatically when no `client` is supplied.

### Patch Changes

- Updated dependencies [[`d4c5d6f`](https://github.com/IcelandicIcecream/aphex/commit/d4c5d6f95389a84ed4f04d3c81d7a931055da9e7)]:
  - @aphexcms/cms-core@9.3.0

## 14.0.1

### Patch Changes

- add visual editing

- Updated dependencies []:
  - @aphexcms/cms-core@9.2.1

## 14.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@9.2.0

## 13.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@9.1.0

## 12.0.0

### Minor Changes

- [#244](https://github.com/IcelandicIcecream/aphex/pull/244) [`8d7c74a`](https://github.com/IcelandicIcecream/aphex/commit/8d7c74a4f0fe62cf18ae9c7c230bfb410ba9da01) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - security fixes + bug fixes 12/05/26

### Patch Changes

- Updated dependencies [[`8d7c74a`](https://github.com/IcelandicIcecream/aphex/commit/8d7c74a4f0fe62cf18ae9c7c230bfb410ba9da01), [`f07240b`](https://github.com/IcelandicIcecream/aphex/commit/f07240b08b2c5969002773e8eb64f779989db494)]:
  - @aphexcms/cms-core@9.0.0

## 11.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@8.1.0

## 10.0.0

### Minor Changes

- better reference fields !

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@8.0.0

## 9.0.0

### Minor Changes

- fix up weird issue with spaces in the name for the cdn

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@7.0.0

## 8.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@6.0.0

## 7.0.0

### Minor Changes

- added a bunch of fixes

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@5.1.0

## 6.0.6

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.6

## 6.0.5

### Patch Changes

- add optimizations

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.5

## 6.0.4

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.4

## 6.0.3

### Patch Changes

- Update to allow singleton support

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.3

## 6.0.2

### Patch Changes

- core minor — singleton schema flag, focus mode .. pg minor - minor — explicit id on createDocument

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.2

## 6.0.1

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.1

## 6.0.0

### Minor Changes

- UPDATE TO STABLE-ISH. UPGRADA-EABLe vers

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@5.0.0

## 5.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@4.0.0

## 4.0.0

### Patch Changes

- Updated dependencies [[`028a247`](https://github.com/IcelandicIcecream/aphex/commit/028a247f5ca5fa61105f975c93e4dedf836d1253)]:
  - @aphexcms/cms-core@3.0.0

## 3.0.1

### Patch Changes

- fix weird import error

- Updated dependencies []:
  - @aphexcms/cms-core@2.1.2

## 3.0.0

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.1.0

## 2.0.11

### Patch Changes

- UI Revamp + Flexible Schema

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.11

## 2.0.10

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.10

## 2.0.9

### Patch Changes

- hmr fixes and ui fixes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.9

## 2.0.8

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.8

## 2.0.7

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.7

## 2.0.6

### Patch Changes

- added versioning

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.6

## 2.0.5

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.5

## 2.0.4

### Patch Changes

- add in memory caching

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.4

## 2.0.3

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.3

## 2.0.2

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.2

## 2.0.1

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.1

## 2.0.0

### Minor Changes

- add github repo and publishConfig"

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@2.0.0

## 1.0.0

### Minor Changes

- Initial Changeset tracking

### Patch Changes

- Updated dependencies []:
  - @aphexcms/cms-core@1.0.0
