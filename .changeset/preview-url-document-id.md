---
'@aphexcms/cms-core': minor
---

A schema's `previewUrl` function gets the document's id as a third argument (null before its first save), so a document with no slug, such as a form, can still name its own preview page.
