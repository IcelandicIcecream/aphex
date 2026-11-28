---
'@aphexcms/plugin-redirects': minor
'@aphexcms/cms-core': minor
'@aphexcms/postgresql-adapter': minor
'@aphexcms/sqlite-adapter': minor
---

New `@aphexcms/plugin-redirects`: old addresses keep working when a page, post or section moves, with a Redirects screen, agent tools and nothing but plugin storage. Plugin storage can now change and remove records (`updatePluginRecord`, `deletePluginRecord`), scoped to the organization like the rest of it.
