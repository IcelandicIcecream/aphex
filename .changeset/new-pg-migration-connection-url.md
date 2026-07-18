---
'@aphexcms/postgresql-adapter': minor
---

Add `pgMigrationConnectionUrl(env)`, preferring `DATABASE_URL_UNPOOLED` over `DATABASE_URL`. Consumers running a boot-migration advisory lock against a pooled Postgres connection (e.g. Neon's Vercel integration, which sets `DATABASE_URL` to a pooled PgBouncer connection by default) should use this for that connection specifically — session-scoped state like `pg_advisory_lock` and `SET lock_timeout` isn't reliably preserved across statements under transaction pooling. Falls back to `pgConnectionUrl(env)` when there's no separate unpooled URL.
