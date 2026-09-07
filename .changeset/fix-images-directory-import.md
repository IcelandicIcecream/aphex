---
'@aphexcms/cms-core': patch
---

Fix a broken import that made the published package unbuildable for every consumer

`server/api/routes/assets.ts` imported the image-config helpers from the directory
`'../../../images'`. `svelte-package` appends `.js` to every relative specifier, which is
correct for a file and wrong for a directory: the published `dist/server/api/routes/assets.js`
asked for `'../../../images.js'`, and no such file exists — the directory ships as
`dist/images/index.js`.

Nothing caught it because the failure only exists in the built artifact. Inside the monorepo
the workspace resolves through `src` and Vite does directory resolution, so every local build,
test and type-check passed. Installing from npm, the same import is unresolvable, and since
`@aphexcms/cms-core/server` reaches it through `src/routes/media/[id]/[filename]/+server.ts`,
**any** app built against the published package failed with:

```
[UNRESOLVED_IMPORT] Could not resolve '../../../images.js' in
  node_modules/@aphexcms/cms-core/dist/server/api/routes/assets.js
```

That covers projects scaffolded with `create-aphex`, the mirrored `aphex-base` /
`aphex-website` templates, and any container image built from them. The import is now written
as `'../../../images/index.js'`, which `svelte-package` leaves alone and Node resolves
directly. A workspace-wide scan found no other directory imports in `.ts` sources
(`.svelte` imports are not rewritten, so they are unaffected).
