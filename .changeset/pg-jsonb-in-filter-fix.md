---
'@aphexcms/postgresql-adapter': patch
---

Fix JSONB `in`/`not_in` filters: drizzle expands an embedded array into a tuple, so the previous `= ANY((a, b))` was invalid Postgres (error 42809) — now emits a plain `IN (...)` list with correct empty-array semantics. Also normalize the raw-SQL result shape in `findAssetByIdGlobal` so it works on drivers that return `{ rows }` (pglite) as well as postgres-js. Both found by the new cross-dialect conformance suite.
