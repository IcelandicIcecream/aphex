---
'@aphexcms/cms-core': major
---

**Embedded Aphex** — Aphex installs into an existing SvelteKit app and claims only `/admin/*`, `/api` and `/media`, leaving the rest of the app (routes, auth, layouts) to the host. This release collects the breaking changes that enable that model. Migrate each item below.

### `locals.auth` → `locals.aphexAuth`

The CMS session is now exposed on `event.locals.aphexAuth` instead of `event.locals.auth`. Aphex no longer squats the top-level `locals.auth` key, so a host app is free to use it for its own auth (e.g. `@auth/sveltekit`) on non-admin routes without a type clash.

**This is a silent runtime break, not a type error.** If your `app.d.ts` still declares `auth?: Auth`, TypeScript keeps compiling but every `locals.auth` read returns `undefined` at runtime. You must find/replace.

Migrate:

1. In `src/app.d.ts`, rename the declared key:
   ```diff
   interface Locals {
     aphexCMS: CMSInstances;
   -  auth?: Auth;
   +  aphexAuth?: Auth;
   }
   ```
2. In every server load / endpoint / hook, rename reads:
   ```diff
   - const auth = locals.auth;
   + const auth = locals.aphexAuth;
   ```
   `authToContext(locals.aphexAuth)`, `getPreviewPerspective(locals.aphexAuth, url)`, and `hasCapability(locals.aphexAuth, …)` follow the same rename.

The `locals.auth` key is now yours.
