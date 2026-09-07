---
'@aphexcms/plugin-forms': patch
---

Fix export paths and ESM import extensions in the published package

The tarball was unusable. `tsconfig.json` set `rootDir` to `./src`, so `tsc` preserved
the extra path segment and emitted `dist/lib/index.js` — while the publish flow
(`scripts/swap-package-paths.js`) rewrites every `./src/lib/x` export to `./dist/x`.
Every entry in `exports`, `main` and `types` therefore pointed at a file that wasn't in
the package.

Two smaller things went with it:

- Relative imports were emitted without extensions (`from './schema'`). Node's ESM
  resolver does no extension guessing, so anything loading this package outside a
  bundler failed. The build now runs the same `fix-imports` pass the other packages use.
- The `exports` map gained a `svelte` condition, matching `@aphexcms/plugin-seo`. It is
  how `vite-plugin-svelte` recognises a package that ships components and bundles it
  rather than leaving it external — this package's schema imports `@lucide/svelte` icons,
  and a `.svelte` file is not something Node can load.

A new `scripts/verify-packed-packages.mjs` runs in CI and before publish: it packs every
publishable package, checks that each export target exists in the tarball and that every
relative specifier resolves literally, and imports the plain-JS ones from an install
outside the workspace. Both faults above are the kind that only exist in the built
artifact, which is why nothing caught them.
