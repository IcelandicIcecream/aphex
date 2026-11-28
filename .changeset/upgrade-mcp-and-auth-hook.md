---
'create-aphex': patch
---

The upgrade also removes the old website template's `src/routes/mcp` (core's hook answers `/mcp` now) and the Better Auth `svelteKitHandler` hook in `src/hooks.server.ts` (core's hook answers `/api/auth`). It recognises the website template's last `/api` catch-all, so that folder goes too.
