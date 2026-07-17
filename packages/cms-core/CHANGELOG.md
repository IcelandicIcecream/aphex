# @aphexcms/cms-core

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
