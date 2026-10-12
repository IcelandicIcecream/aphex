---
'@aphexcms/cms-core': minor
'@aphexcms/postgresql-adapter': patch
'@aphexcms/sqlite-adapter': patch
---

**Local API reads no longer include child organizations by default.** `find()`, `findByID()`, `LocalAPI.findDocumentById()` and `findDocumentsByIds()` scoped every read to the caller's org _plus_ its whole subtree, even though `FindOptions.includeChildOrganizations` is documented `@default false` — so a parent-org site listing quietly showed every child's documents, with no way to opt out short of passing `filterOrganizationIds` on every read. In a multi-tenant app where child orgs are separate tenants, that is a cross-tenant content leak on any public `load()` using `overrideAccess`.

Reads now honour the option: pass `includeChildOrganizations: true` to fold children in. An explicit `filterOrganizationIds` still wins. The admin already sent the flag from the user's preference, so the Studio is unaffected and its toggle starts working as documented; server code that relied on the implicit widening needs to opt in.

Both adapters' `findByDocIdAdvanced` is gated the same way, matching their list paths. That path is only reachable from a direct adapter call now that the Local API always passes an explicit scope, but the two adapters are peers and shouldn't disagree.

Fixes #331.
