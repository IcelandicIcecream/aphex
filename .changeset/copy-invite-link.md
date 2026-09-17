---
'@aphexcms/cms-core': minor
---

Members settings page moves into cms-core. Mount `MembersSettings` from `@aphexcms/cms-core/client/ui` in a thin `+page.svelte` (no `+page.server.ts` needed) and the page improves with version bumps instead of file edits in every scaffolded app. It loads from the new `GET /api/organizations/team` (members with profiles, pending invitations, invitable roles, `emailConfigured`), exposed on the client as `organizations.getTeam()`.

What's new on the page: every pending invitation has a **Copy invite link** button (the `/invite/<token>` accept URL, shown only to callers with `member.invite`), so an editor can be onboarded without email — for testing, or when delivery fails. When no email adapter is configured the invite card says so, the button reads "Create invite link", and the post-invite toast offers **Copy link** instead of claiming an email was sent.

Also: `organizations.inviteMember()` is now typed as returning the created `Invitation` (with `token`) — the server always did; the type said `OrganizationMember`.
