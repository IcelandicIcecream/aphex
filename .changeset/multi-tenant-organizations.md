---
'@aphexcms/cms-core': minor
'@aphexcms/auth': minor
---

Multi-tenant apps can give each organization its own address. A hook before Aphex's sets `locals.aphexTenant` to the organization's slug (for example from the subdomain), and for that request the studio, `/api`, `/media`, GraphQL, MCP and preview all act in that organization, with the user's role there. The session is never rewritten, so two tabs on two tenants both work. A signed-in non-member gets the invitations page, saying they aren't a member, and an API key for another organization gets a 403, from `/api` and from `/mcp`, so an assistant connected to two clients can't edit one through the other's address. A slug no organization has gets a 404 from `/admin`, `/api` and `/media`. `locals.aphexTenantOrganization` is the tenant's organization on every request, for the app's own pages. On a tenant's URL the organization switcher shows only that organization.

The sign-in, invitation and password reset pages show the tenant's name, logo and colour with no `loginBranding`, and `loginBranding` now receives the tenant's `organization`. The login view's data has `organization`, for a custom login component.

The invitations, invite, password reset and two-factor pages can be replaced like the login page, with `components.invitations`, `components.invite`, `components.resetPassword` and `components.twoFactor` in the client config. Each gets `data`, `title` and `authClient`. `AccountViews` lists every page that can be replaced and the data it gets, and the built-in pages are exported (`InvitationsView`, `InviteView`, `ResetPasswordView`, `TwoFactorView`) to wrap.

`useOrganization()` from `@aphexcms/cms-core/client` gives any component inside the studio the organization it's acting in.

`organizationCapabilities` declares capabilities an organization has rather than a role, such as its plan's features. Only its `resolve` function grants them: a role or API key can't, the roles editor doesn't offer them, and an admin's bypass of capability checks in the studio doesn't reach them. They gate plugin tools, document actions and routes like any capability.

`getAphex(config).database.drizzleDb` is typed by the adapter declared in `createCMSConfig`, so an app can query its own tables (passed as the adapter's `schema`) without a cast.

`aphexAuth({ cookieDomain })` shares the session cookie across subdomains, so signing in once works on every tenant's subdomain.

`siteContext(locals)` from `@aphexcms/cms-core/server` gives a site page the organization to read from and a context to read it with: the tenant on a tenant's URL, or the oldest organization in an app without tenants. On a multi-tenant app's URL with no tenant it answers 404 unless the page names an organization. The context reads drafts only during an authenticated preview.
