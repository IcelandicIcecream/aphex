---
'@aphexcms/cms-core': minor
---

`checkOrganizationSlug` in the config lets an app decide which slugs an organization may use, when it's created and when it's renamed (the API and the settings page). Return a reason to refuse one; the person sees it, with a 400. Before this a rename only checked that the slug wasn't empty or taken.
