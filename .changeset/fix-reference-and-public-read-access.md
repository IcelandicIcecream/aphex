---
'@aphexcms/cms-core': patch
---

Fix two read-path access-control gaps: reference resolution in GraphQL, and `public: true` on cached reads

**GraphQL reference resolution bypassed access control.** The scalar-reference and
array-of-references resolvers fetched their targets with
`databaseAdapter.findByDocIdAdvanced`, the one path into the document graph that runs
neither `permissions.canRead` nor the field-level read projection. Any caller able to read
a document could therefore read every document that document _points at_, in collections it
has no access to, and read them unfiltered — a field the schema restricts came back in full
as long as it was reached through a reference rather than queried directly. Both resolvers
now go through `localAPI.findDocumentsByIds`, which resolves each target's type and routes
it through that collection's own `findByID`. Denied targets resolve to `null`; an array of
references keeps its length and indices so a caller pairing it against the raw field can't
misalign.

**`public: true` was applied inconsistently, and the cache made it intermittent.** The
option strips `organizationId`, `createdBy`, `updatedBy` and `publishedHash` from `_meta`.
Three call sites didn't apply it:

- `find()` on a **cache hit** — `findByID` had it, `find` didn't. Cached payloads are stored
  unfiltered on purpose (so two callers with different roles share one entry), which meant
  the same public query leaked while the entry was warm and stopped when it expired.
- `find()` on a **singleton** collection — the option was dropped rather than forwarded to
  `get()`, and that branch returns before the projection applied to a normal query.
- `get()` on a singleton's **first touch**, where the lazy-create path returned the writer's
  view of the freshly created row.

No API changes; both fixes are behavioural. Regression coverage lands in
`graphql-reference-access.test.ts` and `public-projection.test.ts` — both verified to fail
against the previous implementation.
