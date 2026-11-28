---
'@aphexcms/cms-core': patch
'@aphexcms/auth': patch
---

Inline array item types (`of: [{ type: 'object', fields, fieldsets }]`) take `fieldsets` too, checked at boot like the rest.

`@aphexcms/auth` depends on `@better-auth/core` `~1.6.25` itself, so its better-auth plugins all resolve to 1.6. Without it a fresh install could give them 1.7's core, and signing in failed with "does not provide an export named 'getIp'".
