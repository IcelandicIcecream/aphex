---
'@aphexcms/cms-core': minor
---

Each caller now gets a fair share of the API and the MCP server: by default 120 reads, 60 changes and 10 uploads a minute for each API key or connected app, and 600, 240 and 60 for a person signed in to the admin. Over it, `/api` answers `429` with `Retry-After`, and an MCP tool answers an error saying how long to wait, so an agent stuck in a loop or a leaked key can't slow every other site. Set the numbers with `rateLimit` in `aphex.config.ts`, or turn it off with `rateLimit: false`. The password-reset limits also count by the address SvelteKit trusts (`ADDRESS_HEADER`), no longer by a caller-supplied `x-forwarded-for`.
