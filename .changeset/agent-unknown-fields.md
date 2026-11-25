---
'@aphexcms/cms-core': minor
---

An AI agent (MCP) that writes to a field a block doesn't have is told so, with the fields it does have, instead of the value being saved and never shown. Leftovers already stored still save. A field can be retired with `deprecated: { reason }`: agents aren't shown it, and a new value for it is refused with the reason. `validate_document` reports both, and takes the `id` of the document it's checking. Local API callers opt in with `rejectNewUnknownFields`.
