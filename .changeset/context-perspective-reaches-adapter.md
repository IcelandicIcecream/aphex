---
'@aphexcms/cms-core': patch
---

fix: a `perspective` set on the Local API context now reaches the adapter

`find()` and `findByID()` resolved the perspective as _call option → context → `'draft'`_ but forwarded the original options to the database adapter, so a perspective that came only from the context (the way a public site's `siteContext()` bakes it in) was dropped on the way down. The adapter then defaulted to `'draft'`: `where`/`sort` compiled against `draftData`, and the `status = 'published'` guard never ran. Because `transformDocument` _did_ use the resolved perspective, the symptom was a never-published document that matched a published-perspective query and came back as an empty shell — an untitled card on the public archive, a hit in search and the sitemap.

Now the resolved perspective is written into the options the adapter receives, the query cache is keyed on it, and `findByID` in the `published` perspective returns `null` for a document whose status isn't `published`, matching `find`.
