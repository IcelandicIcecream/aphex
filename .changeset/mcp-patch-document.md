---
'@aphexcms/cms-core': minor
---

MCP tools spend far fewer tokens.

- `patch_document` edits part of a document by path (`blocks[_key=="k3"].heading`): set, unset, insert, move, and find-and-replace inside rich text. It sends only what changes and answers with the new revision, not the document; a save in between is re-read and re-applied once. Two items sharing a `_key` are refused rather than guessed between.
- `get_schema` answers with a compact TypeScript outline: shared objects declared once, list values inline, descriptions as comments. A page builder with many block types lists them; pass `types` for the ones you'll write. `detail: 'full'` returns the raw schema as before.
- `get_document`, `get_singleton` and `query_documents` take `fields` and `skim` (each block's key, type and label); the first two take `path` for one value. `_meta` keeps only type, status, revision and dates.
- Answers are compact JSON, and the connection guide no longer asks for `validate_document` before every save.
