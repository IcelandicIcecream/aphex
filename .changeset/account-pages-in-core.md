---
'@aphexcms/cms-core': minor
'@aphexcms/auth': minor
'@aphexcms/resend-adapter': minor
'@aphexcms/nodemailer-adapter': minor
---

Serve invitations, invite links, password reset and the two-factor challenge from the `/admin` catch-all, so an embedded app needs no account routes. Core now has `/api/invitations`, and sends the invitation email itself whenever `email` is set. Customize it with `invitationEmail`. Set the sender on the adapter with `from`.

Upgrading: a host with its own login page (`loginUrl` outside `/admin`, or `createAphexAuth()`) keeps its pages and URLs. Remove any `api` hook that sends invitation emails, or invitees get two. The sidebar's Invitations link is now `/admin/invitations`, so a host needs the `/admin/[...path]` catch-all for it to work. `createAdminLoad` now reads `event.request`, and hosts should hide the sidebar when `page.data.standalone` is true.

Fixes: a signed-in user with no organization was sent to the login page instead of their invitations, and was asked to create an account when following an invite link.
