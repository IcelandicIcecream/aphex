---
'@aphexcms/cms-core': minor
'@aphexcms/auth': minor
---

Apps such as Claude and ChatGPT can connect to `/mcp` with OAuth. Turn it on with `aphexAuth({ oauth: { enabled: true } })` and generate a migration for the four new auth tables. The app registers itself, the user signs in, picks the one site it may use and allows it; the token acts as that user in that organization, can read and edit drafts and use plugins' tools, and can never publish, delete or manage the organization. `/mcp` answers 401 with `WWW-Authenticate` pointing at the discovery documents core now serves under `/.well-known/`. Users see and disconnect their apps under Settings → Account.

`mcp.requiredCapabilities` makes `/mcp` a feature of a plan: every request, with a key or a connected app, needs it, and the site picker shows sites without it as unavailable.

Fixed: `/mcp` never applied the organization's own capabilities, so over MCP every type and tool gated by a plan or a site's feature was hidden, even from organizations that had it. And MCP now lists only the core tools the caller can run, as it already did for plugin tools, so a read-only key no longer sees `publish_document`.

Core now runs SvelteKit's cross-site form check itself, so the OAuth token endpoint, which a client calls from its server with no `Origin`, can be exempt. An app offering OAuth sets `csrf: { trustedOrigins: ['*'] }` in `svelte.config.js` to turn SvelteKit's own check off, and lists any origin it trusted there under `csrf.trustedOrigins` in its Aphex config.
