# create-aphex

## 0.3.2

### Patch Changes

- Cut a template snapshot with the corrected Aphex wordmark, and point the README at
  the one remaining scaffolding command.

  The seeded `logo.png` was rasterised from a master that is white artwork throughout —
  `fill="white"` on the glyph and `stroke="white"` on the ring around it. The conversion
  blackened the fills but not the stroke, so the ring stayed white and vanished against
  the page: a wordmark whose glyph didn't match the `mark.png` sitting next to it. Both
  templates now ship a version with every white reference recoloured on `fill` and
  `stroke` alike.

  This release exists mainly to cut the tag. A `create-aphex` version pins a template
  snapshot, so template fixes reach `npm create aphex` only when this package bumps —
  the mirrored `main` moving is not enough.

  The README also no longer suggests invoking the scaffolder through `aphx`. That
  wrapper package (`@aphexcms/cli`) has been removed from the repo: its only command
  spawned `npx create-aphex` at runtime, so it never needed republishing when this
  package changed, and two commands one letter apart from each other — `aphx` and
  `aphex`, the latter being cms-core's real bin for `generate:types` and `migrate` —
  caused more confusion than it saved typing. `pnpm create aphex` is now the single
  scaffolding path.

## 0.3.1

### Patch Changes

- Scaffold from a template snapshot that carries no build output.

  The `create-aphex-v0.3.0` tag was cut from an `aphex-base` commit that still
  tracked `.svelte-kit/` and `node_modules/`. They had been committed by a sync
  predating the template's `.gitignore`, and because gitignore does not untrack
  what is already tracked, every later sync refreshed them. `npm create aphex`
  therefore produced a project with 246 stale build files and 51 broken symlinks
  before the user had run a single command.

  The mirror no longer tracks them, so this release cuts a new tag from the
  cleaned snapshot. The old tag is left where it is: a `create-aphex` version
  pins a template snapshot, and moving one silently changes what an already
  published version scaffolds.

## 0.3.0

### Minor Changes

- [#309](https://github.com/IcelandicIcecream/aphex/pull/309) [`b67fe26`](https://github.com/IcelandicIcecream/aphex/commit/b67fe2663e7b6e4f1198b97d4f7944c819d4a062) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Add interactive and `--template` selection for the Base and Website starters. Positional project names now work, and `aphx create` forwards its arguments to `create-aphex`.

### Patch Changes

- [#309](https://github.com/IcelandicIcecream/aphex/pull/309) [`b67fe26`](https://github.com/IcelandicIcecream/aphex/commit/b67fe2663e7b6e4f1198b97d4f7944c819d4a062) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Pin scaffold downloads to immutable, CLI-versioned template tags instead of mutable default branches.

- [#309](https://github.com/IcelandicIcecream/aphex/pull/309) [`b67fe26`](https://github.com/IcelandicIcecream/aphex/commit/b67fe2663e7b6e4f1198b97d4f7944c819d4a062) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Generate a working `AUTH_SECRET`, and keep scaffolded projects private

  Two things made a freshly scaffolded project fail on the first command anyone runs.

  `.env` was a straight copy of `.env.example`, which ships the session-signing secret
  deliberately unusable — empty in current templates, and a
  `your-secret-key-here-change-in-production` placeholder in older published ones. So the
  first `pnpm dev` after scaffolding stopped on a missing secret. The scaffolder now
  generates one (32 random bytes, base64url) into whichever key the fetched template uses,
  `AUTH_SECRET` or the legacy `BETTER_AUTH_SECRET`, and leaves any value that is already
  set alone.

  `delete packageJson.private` also removed `private: true` from the generated app. A
  scaffolded project is an application, not a package to publish, and without the flag a
  stray `npm publish` in the project root is accepted rather than refused. It now stays.

  Both are covered by `tests/env.test.mjs`, and the package gained a `test` script — the
  existing argument-parsing tests had no way to run, so CI's "Test scaffolder" step was
  invoking a script that didn't exist.

## 0.2.1

### Patch Changes

- add visual editing

## 0.2.0

### Minor Changes

- added a bunch of fixes

## 0.1.4

### Patch Changes

- Bump bundled template (`@aphexcms/base`) to v0.0.5.

## 0.1.3

### Patch Changes

- add optimizations

## 0.1.1

### Patch Changes

- Bump bundled template (`@aphexcms/base`) to v0.0.3.

## 0.1.0

### Minor Changes

- UPDATE TO STABLE-ISH. UPGRADA-EABLe vers

---

## Previously published as `@aphexcms/aphex-scaffolding`

The scaffolder was renamed to `create-aphex` so that `pnpm create aphex` and
`npm create aphex` resolve to it, and its version was reset to `0.1.0` at the rename.
Everything below is the older package's history and its version numbers are unrelated
to (and higher than) the ones above — `@aphexcms/aphex-scaffolding@0.4.3` is _older_
than `create-aphex@0.1.0`. The old package is no longer updated.

## 0.4.3

### Patch Changes

- fix weird import error

## 0.4.2

### Patch Changes

- UI Revamp + Flexible Schema

## 0.4.1

### Patch Changes

- template fixers

## 0.4.0

### Minor Changes

- update versions on build time

## 0.3.0

### Minor Changes

- updaate to latest versions

## 0.2.0

### Minor Changes

- add github repo and publishConfig"

## 0.1.0

### Minor Changes

- Initial Changeset tracking
