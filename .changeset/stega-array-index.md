---
'@aphexcms/cms-core': patch
---

Click-to-edit inside a page-builder block now opens that block, not the top of the array

Stega payloads for values nested in an array of objects carried `objectPath`
(`[2].richText`) but no `arrayIndex`. The studio picks a page-builder row out of an
array by `arrayIndex` — the same key `ve.edit({ field, arrayIndex })` emits — so
clicking the copy of the third call-to-action on a page revealed the `layout` array
and stopped there, leaving the author to find their own block. Only primitive string
arrays (`tags`) were emitting it.

The index of the outermost array is now threaded through object encoding, portable
text spans and custom block fields. Outermost deliberately: a content block's columns
must not overwrite the index of the block itself, because the studio navigates to the
block and the block's own form shows the column.
