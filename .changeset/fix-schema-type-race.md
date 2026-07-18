---
'@aphexcms/postgresql-adapter': patch
'@aphexcms/sqlite-adapter': patch
---

Fix a race condition in `registerSchemaType` that could 500 on a duplicate-key violation. It used to check for an existing row and then branch into insert-or-update; two concurrent calls (e.g. two serverless instances cold-starting at once and both running `CMSEngine.initialize()`) could both see "not found" and both insert, with the second hitting the unique constraint on `name`. Now a single atomic `insert().onConflictDoUpdate()`.
