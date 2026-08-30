---
'@aphexcms/postgresql-adapter': major
'@aphexcms/sqlite-adapter': major
---

Asset reference cleanup, typed asset metadata, and revision compare-and-swap.

## Breaking

- **`clearAssetFromPublishedData` is renamed `clearAssetReferences`.** It now also clears the ref
  out of `draftData`, which nothing previously did — so deleting an asset left a dangling `_ref` in
  every draft that used it. The `publishedData` behaviour is unchanged and still skips published
  rows deliberately: that column is written only by publish, and rewriting it from a delete would
  break both that invariant and the content hash.

## Fixed

- **The org-hierarchy wrapper now forwards `expectedRevision`.** Both adapters wrap the document
  adapter to retry a not-found read against a child org, and that wrapper dropped the field — so
  compare-and-swap was silently a no-op end to end even though the inner adapter enforced it
  correctly. Now covered by a cross-dialect conformance block run against both pglite and libsql.

## Changed

- `cms_assets.metadata` is typed as `AssetMetadata` on the column rather than asserted at each
  read. Type-only — **no migration**, the column is still `jsonb` / JSON text.
