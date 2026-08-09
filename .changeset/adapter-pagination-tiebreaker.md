---
'@aphexcms/postgresql-adapter': patch
'@aphexcms/sqlite-adapter': patch
---

Give every paginated list a deterministic tiebreaker.

Eight queries across both dialects ordered by `created_at`/`updated_at` alone — change-sets,
events, jobs, plugin storage, and assets. Those columns have millisecond resolution, so rows
written in the same millisecond tie, and an untied sort lets the database return them in either
order per query. Across two offset pages that can show one row twice and skip another entirely.

All eight now break the tie on `id`, matching what `listDocuments` already did. The ids are
random v4, so this buys _stability_, not sub-millisecond ordering — nothing here claims to order
two rows written in the same millisecond, and the fix is that the same page boundary now falls in
the same place every time.

Covered by a conformance case that inserts rows with identical timestamps and pages through them.
