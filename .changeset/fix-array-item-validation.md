---
'@aphexcms/cms-core': patch
---

Fix array fields silently accepting malformed items. Two gaps, both closed:

- Schema-definition validation now rejects an `array` field declared with no
  `of` (or an empty `of`) instead of passing it clean.
- Document-data validation now actually validates array items against `of` —
  previously `validateValueShape`'s `'array'` case only confirmed the value
  _was_ an array and never inspected item shape, so a mistyped or malformed
  item (wrong `_type`, missing required nested fields, a string where an
  object was declared) passed validation silently regardless of whether `of`
  was well-formed. Item resolution mirrors `ArrayField.svelte`'s own matching
  (`ref.name === item._type || ref.type === item._type`, falling back to the
  sole entry only for untagged items in a single-type array — an item
  carrying an explicit, unrecognized `_type` is always an error, never
  silently coerced). Inline object items recurse into their own `fields`, so
  arbitrarily nested arrays-of-objects-with-arrays validate at every depth,
  with a clean dotted/bracketed error path (e.g.
  `sections[0].items[2].label`) rather than repeated wrapping.

Also fixes `ArrayField.svelte` and the exported `isBlockArray` helper
throwing when `field.of` is missing, instead of the previous inconsistency
(admin UI crash vs. silent API accept for the same malformed schema).
