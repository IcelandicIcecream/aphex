---
'@aphexcms/cms-core': minor
'@aphexcms/auth': minor
'@aphexcms/postgresql-adapter': patch
'@aphexcms/sqlite-adapter': patch
---

Deleting an organization or an account now removes everything it leaves behind.

- An organization: hidden files (profile pictures) go too, as do its API keys and connected apps. A file that can't be removed stops the delete, where it used to be left in storage. Someone who isn't a member but had it open no longer blocks the delete.
- An account: the cleanup runs before the sign-in is removed, in one transaction, and covers API keys, pending invitations and the active session. Organizations where they're the only member are deleted with it. The `user.deleted` event no longer carries the email address.
- God Mode: delete any organization, and a Users tab to find and delete accounts. A super admin can't delete another super admin there.
- `beforeOrganizationDelete` may return a function to run once the organization is gone. New `beforeAccountDelete` hook.
- New optional `AuthProvider` methods: `listUsers`, `deleteUser`, `onAccountDelete`, `forgetOrganization`.
