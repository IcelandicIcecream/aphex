---
'@aphexcms/cms-core': minor
---

Generated types: a string field with a `list` is typed as the union of its values (`'fill' | 'whole'`), every branch of a dependent list included, instead of `string`. A comparison with a value the list doesn't have becomes a type error; where saved data can still hold an older value, compare it as a `string` on purpose.
