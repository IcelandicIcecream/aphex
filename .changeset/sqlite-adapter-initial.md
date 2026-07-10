---
'@aphexcms/sqlite-adapter': minor
---

New SQLite database adapter built on libsql: local `file:` databases (zero infra — no Docker, no server) and Turso-hosted `libsql://` URLs with the same adapter. A first-class alternative to the PostgreSQL adapter, not a reduced tier. Implements the full `DatabaseAdapter` interface with the same explicit organization-scoped WHERE filtering the PostgreSQL adapter uses; document JSON filters/sorts run through SQLite's `json_extract`.

When the adapter creates the client from `url`, it applies recommended pragmas (WAL, `synchronous=NORMAL`, `busy_timeout=5000`) to local `file:` databases automatically — configurable via `pragmas: false` (opt out), a typed options object (`{ cacheSize, mmapSize, tempStore, busyTimeout, synchronous, journalMode }` merged over the recommended base), or a raw string of statements run verbatim. Apps that build their own client can call the exported `applyRecommendedPragmas(client, url, options?)` helper.
