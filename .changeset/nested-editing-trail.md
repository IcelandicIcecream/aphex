---
'@aphexcms/cms-core': patch
---

Nested editing says where you are. An object opened inside another (a block › a column › a box) shows the trail in its header, with a back button. Clicking an earlier step goes straight back to it, and on a phone only the step before shows. The header names the item by its preview title, followed by its type when they differ ("Hero · Custom section").

A dropdown with nothing chosen shows the field's default, muted, when it declares one (items added before the field existed never received it). Otherwise it shows "Choose…". It used to repeat the field's title, which read as a value.
