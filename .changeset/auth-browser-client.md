---
'@aphexcms/auth': minor
'@aphexcms/cms-core': patch
---

`@aphexcms/auth/client` exports `adminAuthClient`, so an app no longer writes `src/lib/auth-client.ts` or `src/lib/admin-auth-client.ts`. It also exports `authClient`, better-auth's client, for a login page of your own. `better-auth`, `@better-auth/api-key` and `drizzle-orm` are now regular dependencies of `@aphexcms/auth`, so an app doesn't install them.

Upgrading: in `aphex.client.ts`, import `adminAuthClient` from `@aphexcms/auth/client` and delete those two files. If you keep them, or import better-auth plugins for `aphexAuth()`, keep `better-auth` installed at a version in `@aphexcms/auth`'s range, so that the app and the package share one copy.
