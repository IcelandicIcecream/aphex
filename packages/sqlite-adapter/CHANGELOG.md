# @aphexcms/sqlite-adapter

## 0.1.0

### Minor Changes

- Initial release. New SQLite database adapter built on libsql: local `file:` databases (zero infra — no Docker, no server) and Turso-hosted `libsql://` URLs with the same adapter. A first-class alternative to the PostgreSQL adapter, not a reduced tier. Implements the full `DatabaseAdapter` interface with the same explicit organization-scoped WHERE filtering the PostgreSQL adapter uses; document JSON filters/sorts run through SQLite's `json_extract`.

  When the adapter creates the client from `url`, it applies recommended pragmas (WAL, `synchronous=NORMAL`, `busy_timeout=5000`) to local `file:` databases automatically — configurable via `pragmas: false` (opt out), a typed options object (`{ cacheSize, mmapSize, tempStore, busyTimeout, synchronous, journalMode }` merged over the recommended base), or a raw string of statements run verbatim. Apps that build their own client can call the exported `applyRecommendedPragmas(client, url, options?)` helper.

  SQLite has no Row-Level Security; organization isolation comes from the explicit `organizationId` WHERE clauses every query applies — the same mechanism that actually isolates tenants on pooled Postgres. `multiTenancy.enableHierarchy` works as on Postgres; there is no `enableRLS` option.

  Both adapters run the same cross-dialect conformance suite (`tests/conformance.spec.ts`) against an in-memory libsql and an in-memory PGlite, so filters, sorting, versioning, references, and org isolation behave identically. One documented difference: `contains` uses SQLite's `LIKE`, which is case-insensitive for ASCII only, where Postgres `ILIKE` handles full Unicode.
