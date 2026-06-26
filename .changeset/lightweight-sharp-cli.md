---
'@aphexcms/cms-core': major
---

Trim the published install and speed up the build.

- **`sharp` is now an optional peer dependency** instead of a hard dependency.
  It is used only to extract image metadata (dimensions, colour space, dominant
  colour) on upload, and is now loaded lazily — assets still upload without it,
  metadata extraction is simply skipped (logged as a warning). This removes
  ~30MB of native binaries from installs that don't need image metadata.

  Action required for apps that upload images and import `@aphexcms/cms-core`
  directly: add `sharp` to your own dependencies. The `create-aphex` template
  and the studio app already do, so scaffolded projects are unaffected.

- **`tsx` moved out of runtime dependencies.** The `aphex` CLI is now bundled
  with esbuild and runs on bare `node`, so `tsx` is no longer installed with the
  package.

- The CLI build now uses an esbuild bundle instead of a full `tsc` pass,
  removing a duplicate `dist/lib` tree from the published package.
