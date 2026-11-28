---
'@aphexcms/cms-core': minor
---

`beforeOrganizationDelete` in the config runs when an owner deletes an organization, before anything is erased, so an app can cancel what it keeps outside the CMS (a billing subscription). Throw to stop the delete: nothing changes, and the owner sees the message (the delete dialog now shows the server's message rather than a generic line).
