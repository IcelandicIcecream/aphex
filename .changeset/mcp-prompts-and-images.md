---
'@aphexcms/cms-core': minor
---

MCP prompts and tool images. `mcp.prompts` adds ready-made requests a client offers its user (Claude's "+" menu), filled from a few arguments. A tool result may carry `images`, sent to the client as MCP image content so the model can look at a photo or a logo. `fetchRemoteFile`, the SSRF-guarded fetch behind `upload_asset`, is exported from `@aphexcms/cms-core/server` with an optional `maxBytes`. Core's `z` is exported there too, for plugin tools' input schemas, so an app needs no zod of its own.
