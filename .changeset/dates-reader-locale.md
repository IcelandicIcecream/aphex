---
'@aphexcms/cms-core': patch
'@aphexcms/plugin-seo': patch
---

Dates in the admin are written the way the reader writes them (22/11/2026 in Australia, 11/22/2026 in the US), from the browser's preferred languages rather than its interface language. Several places were fixed to US English. New `formatDate()` helper. Also "Publish changes" and "Read only" in sentence case.
