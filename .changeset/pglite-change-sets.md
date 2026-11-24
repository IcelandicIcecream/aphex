---
'@aphexcms/postgresql-adapter': patch
---

Agent change sets no longer hang on PGlite: they ran outside the one open connection and waited for it forever. Pooled Postgres was never affected.
