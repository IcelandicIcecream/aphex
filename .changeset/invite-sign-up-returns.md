---
'@aphexcms/cms-core': patch
---

Sign-up from an invitation returns to the invitation, which accepts it, instead of the invitations page (where a new, unconfirmed account couldn't accept it). The login page follows only a `callbackUrl` on the same site.
