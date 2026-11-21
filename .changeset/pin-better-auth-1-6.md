---
'@aphexcms/auth': patch
---

Keep `better-auth` and `@better-auth/api-key` on the 1.6 line (`~1.6.25`). `@better-auth/oauth-provider` 1.6 imports `verifyAccessToken` from `better-auth/oauth2`, which 1.7 removed, so a fresh install that resolved better-auth 1.7 couldn't import `@aphexcms/auth`. The starter templates pin the same line, `@better-auth/drizzle-adapter` included.
