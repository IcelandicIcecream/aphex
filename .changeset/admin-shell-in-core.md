---
'@aphexcms/cms-core': minor
'@aphexcms/ui': minor
---

`<AphexStudio>` now renders the admin's sidebar and `createAdminLoad` loads its data, so an embedded app needs no `/admin` layout. Import `@aphexcms/cms-core/admin.css` from the route for the styles. The hook answers `/api` and `/media` when no route of yours matched, so those route files can go too. `/admin/organizations` and God Mode (now `/admin/god-mode`) are core views, and core serves `/api/settings/api-keys` and `/api/instance-settings`. Before this, creating or revoking an API key failed in an embedded app, and the sidebar's God Mode and create-organization links went to pages that didn't exist.

Set the sidebar's links with `sidebar` in `aphex.client.ts`, and `customization.branding.favicon` can now be a function.

Upgrading an embedded app: delete `src/routes/admin/+layout.svelte`, `+layout.server.ts` and `admin.css`, or you'll get two sidebars. Remove the `activeTab` and `handleTabChange` props from `<AphexStudio>`, and import the CSS as above. `/api/[...slug]` and `/media/[id]/[filename]` keep working if you leave them. A hook that runs after Aphex in `sequence()` no longer sees `/api` and `/media` requests unless you keep those route files. A page you added under `/admin` no longer gets the sidebar.

Apps using `templates/base` keep their own admin layout, but the sidebar's God Mode link now goes to `/admin/god-mode`, which needs the catch-all.

`allowUserOrgCreation` now does what it says: with it on, any signed-in user can create an organization, including someone with none yet, who gets the option on the invitations page. A new organization is top-level, unless `parentOrganizationId` names one the user has `org.settings` in. This applies to super admins too, who used to get their active organization as the parent by default.

The UI libraries and GraphQL packages that were peer dependencies of `@aphexcms/cms-core` and `@aphexcms/ui` are now regular dependencies, so an app no longer installs them itself. `sharp` and `graphql` are the exceptions, because they stay outside the server bundle.
