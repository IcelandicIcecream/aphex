---
'@aphexcms/cms-core': minor
---

Arrays can open a grouped, searchable "add item" dialog instead of the dropdown: `options.insertMenu` with `groups`, `filter` and `views` (a grid with a thumbnail per type, or a list), shaped like Sanity's. Each card shows the type's title and `description`, and an `of` entry may now declare a `description` of its own. Arrays without `insertMenu` are unchanged.
