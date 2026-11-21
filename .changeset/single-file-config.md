---
'@aphexcms/cms-core': minor
'@aphexcms/auth': minor
'@aphexcms/sqlite-adapter': minor
'@aphexcms/postgresql-adapter': minor
'@aphexcms/storage-s3': minor
'@aphexcms/resend-adapter': minor
---

Declare every adapter inline in `aphex.config.ts`. `sqliteAdapter()`, `postgresAdapter()` and `pgliteAdapter()` connect on the first request, `aphexAuth()` builds auth from them and creates its own tables, and `s3Storage()` and `resendAdapter()` need no credentials until first use. `s3Storage().adapter` still works but is deprecated. Prerendered pages no longer fail the build.
