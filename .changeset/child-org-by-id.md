---
'@aphexcms/cms-core': patch
---

Reading one document by id reaches child organizations again. With "include child organizations" on, the document list showed a child organization's documents, but opening one said "Document not found", and so did publishing or unpublishing it. `findByID` and `findDocumentById` now include child organizations unless you pass `includeChildOrganizations: false`, which matches how saving already worked. Lists and queries still include them only when asked. A child organization still can't read its parent's or a sibling's documents.
