---
'@aphexcms/cms-core': minor
---

`parentOf(documentData, siblingData)` finds the block or object that owns an array item, so a `hidden` rule on an item's field can follow a choice made on its block. Arrays of strings take `options.layout: 'tags'`, chips in one box added with Enter or a comma, with a `placeholder`; a `tags` layout on anything else fails at boot. Text and string inputs show the field's own `placeholder` and no longer repeat the field's title inside an empty box.
