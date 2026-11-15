---
'@aphexcms/cms-core': minor
---

API routes now know which tenant a request's address names: `c.var.tenant` is the organization in `locals.aphexTenantOrganization`, or `null` when the host names none. A route an anonymous visitor writes through can use it to keep each tenant's address to that tenant's own data. If your app forwards `/api` with its own `[...slug]` route, pass `tenant: locals.aphexTenantOrganization ?? null` to `apiApp.fetch` as the website template now does. Without it, `c.var.tenant` is `null`.

`/media/:id/:name` on a tenant's address now serves only that tenant's files, and its child organizations'. Before, any tenant's address served every other tenant's public files. Private files were already protected. On an address with no tenant, nothing changes.
