---
'@aphexcms/postgresql-adapter': patch
'@aphexcms/sqlite-adapter': patch
'@aphexcms/cms-core': patch
---

`includeChildOrganizations` now works for assets. It never had.

Both adapter facades resolved the organization's subtree and passed the result down as
`filterOrganizationIds` — and both asset adapters ignored the field entirely, building their
`WHERE` from `organizationId` alone. A parent organization asking for its subsidiaries' media
got its own library back, with no error to say the request had been dropped.

`buildAssetConditions` now scopes to `filterOrganizationIds` when the facade supplies it. It
_replaces_ the single-org clause rather than joining it with `AND`, which would have narrowed
straight back to the caller.

`countAssets` was widened too. The facade had only ever expanded the hierarchy for
`findAssets`, so had the filter worked, a page spanning the subtree would have sat under a
total that didn't — "1–20 of 4" over twenty rows. Both now go through one
`resolveAssetOrgScope` helper, the same reason the two share a clause builder.

`AssetFilters` gains `includeChildOrganizations` and `filterOrganizationIds`, so the facade
signatures drop their `any`. The two are a request and its resolution: callers ask for the
subtree, the facade resolves it once per request.

Widening is opt-in and downward-only — a child never sees its parent's library — and it
composes with search, category and usage rather than replacing them. Covered by the
cross-dialect conformance suite.

No behaviour changes without the flag, and nothing in the admin UI sets it for assets yet.
