---
'@aphexcms/cms-core': minor
---

`/mcp` now tells a client how to work with Aphex when it connects: the MCP server instructions that Claude, ChatGPT, Claude Code and Cursor read before calling a tool. Core's guide covers schemas, drafts and publishing, images, and not inventing business facts, and names the site. An app adds its own section with `mcp.instructions` (a string, or a function of the site and caller), and a plugin with an `aphex/agent/instructions` part, shown only to callers holding its `requiredCapabilities`.
