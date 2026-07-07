---
'@aphexcms/cms-core': minor
---

`aphex migrate` now supports SQLite (libsql) as a third driver alongside Postgres and pglite. Detection: `APHEX_DATABASE=sqlite` or a `DATABASE_URL` starting with `file:`/`libsql:`. Remote (Turso) databases use `DATABASE_AUTH_TOKEN`.
