---
'@aphexcms/cms-core': patch
---

A tool's `openDocument(type, id, { field })` now lands on the field, not only its tab: the editor scrolls to it once the document has loaded, as it does for a field clicked in a preview. A new `objectPath` option goes inside the field the same way a preview click does, so `{ field: 'blocks', objectPath: '[2].heading' }` opens the page's third block and focuses its heading.
