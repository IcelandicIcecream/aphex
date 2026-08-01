---
'@aphexcms/cms-core': patch
---

Fix a runtime import that broke every document write, publish, version restore, and agent change-set request in 9.8.0: `Failed to load url ../../../db/interfaces.js`.

Four route modules imported `RevisionConflictError` from the **directory** `'../../../db/interfaces'` rather than `'../../../db/interfaces/index'`. The build rewrites a bare specifier by appending `.js`, producing `db/interfaces.js` — a file that doesn't exist, since the directory ships as `db/interfaces/index.js`. Inside the monorepo the same import resolves fine (the bundler finds the directory's index), so this only ever surfaced in a real install from the published tarball.

Type-only imports of the same path were unaffected — they're erased at compile time and never emit a specifier — which is why this landed with the compare-and-swap work: `RevisionConflictError` is the first _value_ imported from that directory by a route, so it's the first one to emit a runtime import.

Fixed in `documents-by-id.ts`, `documents-publish.ts`, `document-versions.ts`, `agent-change-sets.ts`, and normalized `services/references-service.ts` to the same `db/interfaces/index` form the rest of the package already uses.
