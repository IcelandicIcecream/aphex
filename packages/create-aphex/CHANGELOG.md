# create-aphex

## 0.3.4

### Patch Changes

- [#315](https://github.com/IcelandicIcecream/aphex/pull/315) [`9675a57`](https://github.com/IcelandicIcecream/aphex/commit/9675a5709e8264e4628b6f88bcf957a1201ccf45) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Rename the object-storage environment variables from `R2_*` to `S3_*`, and let the
  region through.

  The adapter was never R2-specific — it is a plain S3 client, with worked examples for
  R2, AWS S3 and MinIO — but the variable names said otherwise, so the one configuration
  group read as a Cloudflare-only feature. The canonical names are now `S3_ENDPOINT`,
  `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`, `S3_CDN_URL`
  and `S3_REGION`.

  **Existing deployments need no change.** Each variable still falls back to its `R2_*`
  spelling, with `S3_*` winning where both are set — a half-migrated environment would
  otherwise quietly keep using the old value while the new one looked applied.

  `S3_REGION` is new, and its absence was a real bug rather than a missing nicety: the
  adapter accepts a region and defaults to `'auto'`, but no template ever passed one, so
  there was no way to set it from the environment. `auto` is what R2 and MinIO want and
  what AWS S3 rejects — the region is part of the SigV4 credential scope, so against a
  real S3 bucket every request signed as `auto` and came back `SignatureDoesNotMatch`
  with the configuration looking entirely correct. AWS S3 was documented as supported and
  was not reachable from a deployed template.

  Both `render.postgres.yaml` blueprints now list `S3_REGION` alongside the rest, and the
  storage docs carry the AWS caveat.

## 0.3.3

### Patch Changes

- [#313](https://github.com/IcelandicIcecream/aphex/pull/313) [`b8b67e5`](https://github.com/IcelandicIcecream/aphex/commit/b8b67e5d9f769c5fdbfb6831db7a9dc1e8456c10) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Keep scaffolded development servers on Vite's default loopback host so a SvelteKit
  app already using localhost:5173 is detected and Aphex advances to the next free
  port. Network-wide development hosting remains available explicitly with
  `pnpm dev --host`.

- [#313](https://github.com/IcelandicIcecream/aphex/pull/313) [`4c6b724`](https://github.com/IcelandicIcecream/aphex/commit/4c6b7245cf85107259062ccb5afda700a4d1de20) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Send newly created non-bootstrap accounts directly to `/invitations` so invited
  users explicitly accept or decline their pending organization invitation. Carry
  the same destination through email verification; the initial bootstrap owner still
  lands on `/admin`.

- [#313](https://github.com/IcelandicIcecream/aphex/pull/313) [`4c6b724`](https://github.com/IcelandicIcecream/aphex/commit/4c6b7245cf85107259062ccb5afda700a4d1de20) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Rebase persisted local-asset paths from explicitly trusted former storage roots after an uploads directory move, while continuing to reject every other path outside the active storage root. The templates now recognize their former `static/uploads` and `uploads` defaults so existing media keeps working after files are moved to `APHEX_UPLOADS_DIR`.

- [#313](https://github.com/IcelandicIcecream/aphex/pull/313) [`a7844bc`](https://github.com/IcelandicIcecream/aphex/commit/a7844bc1d045cacd787fe301d782827b29f9969a) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix scaffolded sites seeding with no logo, favicon or hero image in production.

  Both templates bundle a few images the seed uploads on first run — the base template's
  wordmark and favicon, and the website template's those plus the hero artwork the
  headline sits on. They were read from disk at seed time, resolved relative to the
  module:

  ```ts
  const assetsDir = fileURLToPath(new URL('./assets/', import.meta.url));
  ```

  That only holds in dev, where Vite serves modules from source and `./assets/` really is
  next to the seed. Every production build bundles the seed into
  `build/server/chunks/`, and a binary that nothing ever `import`s is not emitted
  alongside it — so the directory did not exist and all three reads failed. Docker was
  never involved; `pnpm build && node build` reproduces it.

  It failed silently, which is why it reached a deploy: the read was wrapped in a
  `try/catch` that logged `[seed] Missing bundled asset` and returned `null`, so the seed
  reported success with the images quietly absent. The article photographs still appeared,
  because those are fetched from picsum over HTTP and never touch the filesystem — the
  missing images were exactly the ones bundled _because_ they should not depend on the
  network.

  The assets are now imported with `?inline`, so the bundler turns each into a base64 data
  URI at build time and the bytes travel inside the module. This makes them build inputs
  rather than runtime paths: a missing file is a build failure instead of a warning in a
  deploy log, and the decode cannot fail at run time, so the `null` branch is gone. The
  base template keeps its `try/catch` around the _upload_, which talks to storage and
  genuinely can fail; the picsum fetch keeps its soft failure, which was always right for
  it.

  Costs ~260KB of base64 in the website template's server bundle for the 194KB hero JPEG,
  which is the price of not depending on a path that does not exist.

  Released as a `create-aphex` patch because the templates are `ignore`d by changesets and
  the scaffolder pins a tag named after this package's version — the sync workflow never
  moves an existing tag, so a template-only change does not reach `pnpm create aphex`
  until a new version is cut.

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
