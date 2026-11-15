---
'@aphexcms/postgresql-adapter': patch
---

Asset-reference calls (`replaceAssetReferences`, `findAssetReferenceFieldPaths`, `countAssetReferencesForAssets`, `hasAnyAssetReferences`) and `listStoredDocumentTypes` now set the organization context on pglite, like document references already did. Without it, row-level security cast an empty organization id and threw `invalid input syntax for type uuid: ""`, for example when the admin counted an asset's usages outside a save. Pooled Postgres is unchanged.
