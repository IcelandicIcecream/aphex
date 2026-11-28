---
'@aphexcms/cms-core': patch
'@aphexcms/auth': patch
---

Security:

- An invitation can't be claimed by address alone with an unconfirmed email. Anyone could sign up with an invited address and join; now they open the emailed link. `AuthUser.emailVerified` says which, and a provider that leaves it unset is trusted. Accounts with a confirmed email see no change.
- Nobody hands out more than they hold: inviting, changing a member's role, and creating or editing a role need every capability being given (owners and instance admins may give any). An invitation's link is shown only to someone who could have sent it.
- Only owners can remove an owner or change an owner's role: a custom role holding `member.remove` or `member.changeRole` could.
- A stored SVG whose type carries parameters or capitals (`image/svg+xml; charset=utf-8`) is served with the same download and sandbox headers as any other SVG.
