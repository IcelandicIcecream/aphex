// MCP server endpoint — re-exported from Aphex CMS Core.
// Lets an MCP client (Claude Code, Cursor) read and build your content via an
// org-scoped API key. The implementation ships with @aphexcms/cms-core; bump the
// package to update it. See the MCP docs for connecting a client.
export { POST, GET, DELETE } from '@aphexcms/cms-core/routes/mcp';
