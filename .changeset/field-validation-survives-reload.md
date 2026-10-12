---
'@aphexcms/cms-core': patch
---

**Field validation state survives a reload.** `DocumentEditor` kept its field-component refs in an index-keyed array that never lined up with `schema.fields` — only the active group's fields render, so positions never matched — and in the source the refs were never bound at all. Per-field validation after a load or an autosave was therefore a complete no-op, and Publish stayed enabled after a refresh until someone clicked it and got the error.

Refs are keyed by field name now, and the editor settles `hasValidationErrors` on load.
