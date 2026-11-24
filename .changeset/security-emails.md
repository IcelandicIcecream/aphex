---
'@aphexcms/cms-core': minor
'@aphexcms/auth': minor
---

Security emails, off by default (`aphexAuth({ options: { securityEmails: true } })`): a sign-in from a new device, a changed or reset password, two-factor turned off, an API key created, an app connected, repeated failed sign-ins, and, to the other owners, a new owner or admin. Each account email has a "This wasn't me" link to a page that signs out every device, stops the password working and emails a reset.

Account settings lists the signed-in devices, with Sign out for each and for all the others.

The email telling owners about a new owner or admin takes the app's own template: `roleNoticeEmail` in the CMS config.
