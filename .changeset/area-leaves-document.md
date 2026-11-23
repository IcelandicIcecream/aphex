---
'@aphexcms/cms-core': patch
---

Opening a tool from the sidebar (Design, SEO, a plugin's page) while a document is open closes the document, so its header no longer stays above the tool.

With `openPreview`, a document reopened after leaving the editor (a tool's link back to it) opens its preview again.
