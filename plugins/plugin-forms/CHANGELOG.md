# @aphexcms/plugin-forms

## 0.1.1

### Patch Changes

- [#309](https://github.com/IcelandicIcecream/aphex/pull/309) [`b67fe26`](https://github.com/IcelandicIcecream/aphex/commit/b67fe2663e7b6e4f1198b97d4f7944c819d4a062) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Show each form field's input type and a distinct icon in collapsed array previews.

- [#309](https://github.com/IcelandicIcecream/aphex/pull/309) [`b67fe26`](https://github.com/IcelandicIcecream/aphex/commit/b67fe2663e7b6e4f1198b97d4f7944c819d4a062) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Fix export paths and ESM import extensions in the published package

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

- [#309](https://github.com/IcelandicIcecream/aphex/pull/309) [`b67fe26`](https://github.com/IcelandicIcecream/aphex/commit/b67fe2663e7b6e4f1198b97d4f7944c819d4a062) Thanks [@IcelandicIcecream](https://github.com/IcelandicIcecream)! - Harden public forms for production: restrict stored submissions to organization owners and admins, route writes to the form's exact tenant, expose only an allowlisted public form projection, reject stale or oversized submissions, validate authored invariants, use trusted connection addresses for rate limits, and make submission events atomic and notification failures retryable.

- Updated dependencies [[`bc52568`](https://github.com/IcelandicIcecream/aphex/commit/bc525687a23525a19ba7a924d1b70a75974ead90), [`b67fe26`](https://github.com/IcelandicIcecream/aphex/commit/b67fe2663e7b6e4f1198b97d4f7944c819d4a062), [`e1a5693`](https://github.com/IcelandicIcecream/aphex/commit/e1a56936ef339cf050935986e082d1f71db1621a), [`f9df2ff`](https://github.com/IcelandicIcecream/aphex/commit/f9df2ffb33c6cc8969fbe3e479e7a7e082114215), [`03a1ab0`](https://github.com/IcelandicIcecream/aphex/commit/03a1ab04e68665fda2f98b8b75069e392f51f11f), [`b67fe26`](https://github.com/IcelandicIcecream/aphex/commit/b67fe2663e7b6e4f1198b97d4f7944c819d4a062), [`b67fe26`](https://github.com/IcelandicIcecream/aphex/commit/b67fe2663e7b6e4f1198b97d4f7944c819d4a062), [`b67fe26`](https://github.com/IcelandicIcecream/aphex/commit/b67fe2663e7b6e4f1198b97d4f7944c819d4a062), [`6343a71`](https://github.com/IcelandicIcecream/aphex/commit/6343a71e7985b4b9cb8629045adc141b466272bb), [`b67fe26`](https://github.com/IcelandicIcecream/aphex/commit/b67fe2663e7b6e4f1198b97d4f7944c819d4a062), [`debafeb`](https://github.com/IcelandicIcecream/aphex/commit/debafeb8657ff31815ce11d065a1edcf98fec801), [`b67fe26`](https://github.com/IcelandicIcecream/aphex/commit/b67fe2663e7b6e4f1198b97d4f7944c819d4a062), [`b67fe26`](https://github.com/IcelandicIcecream/aphex/commit/b67fe2663e7b6e4f1198b97d4f7944c819d4a062), [`7b8e85c`](https://github.com/IcelandicIcecream/aphex/commit/7b8e85c9742b9755c9beadcd889dc8657cbf920e), [`b67fe26`](https://github.com/IcelandicIcecream/aphex/commit/b67fe2663e7b6e4f1198b97d4f7944c819d4a062), [`b67fe26`](https://github.com/IcelandicIcecream/aphex/commit/b67fe2663e7b6e4f1198b97d4f7944c819d4a062), [`5d72187`](https://github.com/IcelandicIcecream/aphex/commit/5d72187348af378c7867fd23220856dc6001eaea), [`b67fe26`](https://github.com/IcelandicIcecream/aphex/commit/b67fe2663e7b6e4f1198b97d4f7944c819d4a062), [`b67fe26`](https://github.com/IcelandicIcecream/aphex/commit/b67fe2663e7b6e4f1198b97d4f7944c819d4a062), [`b67fe26`](https://github.com/IcelandicIcecream/aphex/commit/b67fe2663e7b6e4f1198b97d4f7944c819d4a062)]:
  - @aphexcms/cms-core@11.0.0
