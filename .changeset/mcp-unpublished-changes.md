---
'@aphexcms/cms-core': patch
---

Draft reads of a published document now carry `_meta.hasUnpublishedChanges`, so an MCP agent (or any Local API caller) can tell when the draft has edits the live site doesn't show yet. MCP reads and write results include it, and the agent's instructions explain it.
