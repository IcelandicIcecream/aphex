---
'@aphexcms/cms-core': minor
'@aphexcms/postgresql-adapter': minor
'@aphexcms/sqlite-adapter': minor
---

`depth` reads every referenced document as the caller. The database adapters used to expand references themselves, reading each target as a raw row with no permission check, so a document anyone could read handed over every document it referenced in full: a type the caller's role couldn't read, a type the organization lacked (`requiredCapabilities`), read-restricted fields, and the target's draft even in the published perspective. The Local API now expands references after its own permission check, through each target's collection (`findDocumentsByIds`), in the caller's perspective. GraphQL already did this. This applies to the Local API's `find` and `findByID` and to the REST `depth` parameter.

A target the caller can't read, a missing one, or one that would close a cycle stays `{ _type: 'reference', _ref }`. A resolved reference now has the shape a direct read of it returns (`{ id, ...fields, _meta }`), which is what the generated `*Resolved` types already described, instead of a raw row with `draftData` and `publishedData`. An array item keeps its `_key`. A document reached through two parents is expanded fully under each; previously the second occurrence's own references were left unexpanded. The adapters ignore `depth`, and the published-read cache never holds expanded documents, so one caller's expanded read can't be served to another.
