---
'@aphexcms/cms-core': minor
---

The document editor keeps up with saves made elsewhere (another tab, an AI agent over MCP). An open, visible editor checks the document's revision every five seconds and when its tab comes back (`GET /documents/:id?meta=1`, only the id and `_meta`). With nothing unsaved, the other version simply appears. With unsaved edits to other fields, the two are merged field by field (blocks and rich text by their `_key`s) and autosave carries on. A save refused as stale now merges the same way instead of stopping. Only a field both sides changed stops autosave, and the bar names it.
