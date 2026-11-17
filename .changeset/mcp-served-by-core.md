---
'@aphexcms/cms-core': minor
'@aphexcms/auth': minor
---

The MCP server's address is now `/admin/mcp`, served by core's hook as `/api` is, so an app needs no route file and Aphex no longer claims a path outside `/admin`. `/mcp` keeps answering, so clients set up with it keep working, and tokens are issued for either. OAuth discovery advertises `/admin/mcp`.

Before, an app without `src/routes/mcp/+server.ts` advertised an MCP server that answered 404, and a site's `[slug]` page caught `/mcp` and answered 405. Only a route at the exact path now takes core's place, and the old one-line re-export keeps working and can be deleted.

An app that wants no MCP sets `mcp: { enabled: false }`: `/admin/mcp` and `/mcp` are then ordinary paths, their protected-resource metadata goes, and the SDK never loads.
