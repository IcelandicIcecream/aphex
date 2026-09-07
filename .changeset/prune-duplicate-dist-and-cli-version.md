---
'@aphexcms/cms-core': patch
---

Halve the published tarball and report the CLI's real version.

The build runs `svelte-package` (flat output into `dist/`, which every export
resolves to) and a src-rooted `tsc` (needed for `dist/cli`, but which also emitted
a second complete copy of the library under `dist/lib`). `files: ["dist"]` shipped
both, so ~5MB of the package was a duplicate no export pointed at. The CLI did
reach into it — `../lib/type-gen.js`, and a dozen modules transitively — so it
couldn't just be deleted; a new build step rewrites those specifiers to the flat
equivalents svelte-package produced from the identical source, then removes the
tree, and refuses to prune if any rewritten target is missing rather than
publishing a CLI whose imports resolve to nothing. `dist` drops from 9.8MB to 4.8MB.

`aphex --version` also read a hardcoded string that had drifted four majors behind
the package it ships in (`0.1.14` from `@aphexcms/cms-core@10.0.0`). It now reads
`package.json`, so it can't go stale again.
