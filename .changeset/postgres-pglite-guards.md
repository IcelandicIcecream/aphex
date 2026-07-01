---
'@aphexcms/postgresql-adapter': minor
---

Add PGlite corruption guards. New `createPgliteClient(dataDir?)` export returns an HMR-safe singleton (one instance per data dir per process, cached on `globalThis`) and registers a graceful-shutdown hook (`beforeExit`/`SIGINT`/`SIGTERM`) that closes PGlite cleanly. This prevents the double-open and mid-write corruption that PGlite (which lacks Postgres's WAL crash recovery) is prone to during dev HMR and process exits. `createPgliteProvider` uses the guarded client automatically when no `client` is supplied.
