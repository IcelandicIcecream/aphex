---
'@aphexcms/cms-core': patch
---

`openPreview` no longer pops the preview open on a document you've just created, when its first autosave gives it an id. A new document has no saved draft or address to show yet; it opens with the preview the next time it's opened.
