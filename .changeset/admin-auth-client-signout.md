---
'@aphexcms/cms-core': major
---

`AdminAuthClient.signOut` is required. The sidebar's Sign out and the invitations page call it, and a client without it left the person signed in with no error. `adminAuthClient` from `@aphexcms/auth/client` has it.
