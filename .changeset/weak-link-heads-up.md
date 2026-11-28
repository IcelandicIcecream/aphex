---
'@aphexcms/cms-core': minor
---

Publishing a document whose weak references point at drafts (or at deleted documents) asks first: "“Pricing” isn't published yet. This links to it, and the link won't show until it's published", with Publish anyway, Cancel and a link to open each draft. Strong references still block publishing as before. `confirmDialog` takes `links`, shortcuts shown under its description.
