---
'@aphexcms/cms-core': minor
---

Fields that don't exist are judged when they're written, not when they're already stored.

- An AI agent (MCP) or an API key (HTTP, GraphQL) that writes to a field the schema doesn't have is refused, with the fields it does have. Inside a registered block such a value used to save and never show, so an integration sending one will now get a 400. Copying a block that holds a leftover under a new key counts as writing it.
- A value left over from a field since removed no longer stops a save, a publish or a version restore. Outside registered blocks it used to, with nothing in the admin to clear it.
- A field can be retired with `deprecated: { reason }`. It keeps working; agents aren't shown it and are refused new values with the reason, and an API key gets a warning in `validation.warnings`.
- `validate_document` reports all of this, and takes the `id` of the document it's checking. Local API callers opt in with `rejectNewUnknownFields`.
