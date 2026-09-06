---
'@aphexcms/cms-core': patch
---

Fix directory imports breaking the published build

Importing certain modules from the package crashed at runtime with
`Failed to load url ../../../images.js ... Does the file exist?`. It affected the
assets route (`server/api/routes/assets.js`) and the client API barrel
(`client/api.js`).

The cause was the build's import-rewriting step. Source code imports a couple of
modules by directory — `from '../../../images'`, which bundler resolution takes
to mean `images/index.ts`. The rewriter appended `.js` unconditionally, producing
`../../../images.js`, a path that does not exist; the real file is
`images/index.js`. It now detects a directory target and emits `/index.js`.

This was invisible inside the monorepo, where every consumer resolves the
package's `src` rather than `dist`, so only installed users ever saw it. There is
a new `scripts/run-template-standalone.sh` that runs a template against packed
tarballs — the real published artifact — which is how this surfaced and how the
class of bug gets caught from now on.
