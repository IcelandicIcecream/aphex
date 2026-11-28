---
'create-aphex': patch
---

The upgrade does more of the move for apps made from older templates:

- It removes the old website template's `src/routes/mcp` (core's hook answers `/mcp` now) and the Better Auth `svelteKitHandler` hook in `src/hooks.server.ts`, wherever it sits in `sequence()` (core's hook answers `/api/auth`).
- It recognises the website template's last `/api` catch-all, so that folder goes too.
- A sign-in page whose only addition is `<meta name="robots" content="noindex, nofollow" />` is replaced like an untouched one, since core's page has that tag.
- The app's own `better-auth`, `@better-auth/api-key`, `@better-auth/core` and `@better-auth/drizzle-adapter` are installed at `~1.6.25`, the line `@aphexcms/auth` uses. A `^1.6` range resolved to 1.7 on a fresh install, which `@aphexcms/auth` can't import, and left two copies.
