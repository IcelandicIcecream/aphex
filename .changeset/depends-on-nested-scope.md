---
'@aphexcms/cms-core': minor
---

Fix `dependsOn` (and slug `source`) inside objects and array items

A dependent list resolved `dependsOn` against the document root only. `dependsOn`
names a _sibling_, and a field nested in an object or an array item has no siblings
at the root — so a dependent list inside a page-builder block always found
`undefined` and rendered "Please select X first" forever, which is indistinguishable
from ordinary empty state. Arrays were the worst case: `SchemaField` passed no
document data to `ArrayField` at all, so nothing below an array could resolve
anything.

Fields now receive two scopes. `documentData` is always the whole document;
`siblingData` is the object the field is actually a member of — the array item, the
inline object, or the document itself at the top level. `dependsOn` and a slug's
`source` resolve against `siblingData` first and fall back to `documentData`, so a
dependent list may name either a field of its own object or a document-level field,
and repeated array items each resolve against their own values instead of sharing
one answer.

`ObjectModal` previously passed the edited object as `documentData`, which made
local lookups work but hid the document from anything inside a modal; it now passes
both, so the modal path gains the root fallback it never had.

For plugin field components, `FieldComponentProps` gains `siblingData` alongside
`documentData`, and `documentData` now consistently means the document in every
position. A widget reading a sibling should switch to `siblingData` — inside an
array item those are different objects.
