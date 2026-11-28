---
'@aphexcms/cms-core': minor
'@aphexcms/auth': minor
---

Someone who has only signed in with Google (or another social provider) is offered "Set a password" in Account settings, instead of a "Change password" that asks for a password they don't have. It emails them a link (the reset flow), which adds a password beside Google. New optional `AuthProvider.signInMethods(userId)`, which `@aphexcms/auth` implements: `'credential'` for a password, else the provider's id.
