---
'@aphexcms/cms-core': minor
---

Add a built-in MCP server so coding agents (Claude Code, Cursor) can read and build content over an org-scoped API key. Ships with the package via a re-exportable SvelteKit route (`@aphexcms/cms-core/routes/mcp`) using the official `@modelcontextprotocol/sdk` over Streamable HTTP (`@hono/mcp`), plus a transport-agnostic tool registry (`buildContentTools`). Tools derive their schema/field-type knowledge from the real validators and run under the caller's RBAC + RLS scope. Also includes richtext/portable-text editor fixes.
