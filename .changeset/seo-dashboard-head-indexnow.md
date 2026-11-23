---
'@aphexcms/plugin-seo': minor
---

The SEO dashboard is rebuilt around what to fix. It now also checks titles that get cut off, duplicate titles and descriptions, images without alt text, and share images that are too small or the wrong shape, and it lists every kind of problem with how many pages have it. New: `resolveSeo(doc, { url, siteName })` and `<SeoHead>` give a page its title, description, canonical, robots and share-card tags with the same fallbacks as the admin's search preview. A new `indexNow` option tells Bing and the other IndexNow engines when a page is published.
