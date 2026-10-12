---
'@aphexcms/cms-core': minor
'@aphexcms/postgresql-adapter': patch
'@aphexcms/sqlite-adapter': patch
---

**Document counts are scoped to the caller unless children are opted in.** `countDocsByType` and `getDocCountsByType` widened to the whole subtree whenever hierarchy was enabled and took no parameter to say otherwise — so with reads now scoped to the caller, a count would have disagreed with every list beside it. That is how a sidebar badge ends up reading 400 over twenty rows.

Both now take an optional `{ includeChildOrganizations }` (the new `OrgScopeOptions`, exported from `@aphexcms/cms-core/server`) and default to the caller's own organization, matching `FindOptions`. Pinned cross-dialect in the sqlite adapter's conformance suite.

`CollectionAPI.count()` still cannot be widened — it passes only `where` down to `countDocuments`, which has no hierarchy path in either adapter. That is consistent with the new default but remains a gap for parent-org dashboards.
