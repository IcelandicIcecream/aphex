---
'@aphexcms/cms-core': minor
---

Reference fields take `weak: true`, as in Sanity: the document may be published while what it points at is still a draft, so two pages that link to each other can both go live. Publishing (the local API and the editor) now checks only strong references, reading the schema to tell them apart, so references saved before a field was made weak count as weak too. New helper `collectStrongReferenceIds(data, schema, registry)`.
