---
'@aphexcms/auth': minor
'@aphexcms/cms-core': minor
---

Close three gaps in the auth surface.

**API-key revocation now fails closed.** Deleting a key removes the row and evicts the cached
copy the api-key plugin keeps as secondary storage. If that eviction failed, the row was gone but
a live key stayed in cache — revocation reported success while the key kept authenticating.
Eviction now retries three times with backoff and, if it still fails, throws the new
`ApiKeyRevocationError` (exported as a value, so route handlers can `instanceof` it and tell an
incomplete revocation from an ordinary delete failure). The caller sees a 500 rather than a false
"revoked".

**The password-reset facades are rate-limited.** `POST /api/user/request-password-reset` and
`/reset-password` call the auth provider _server-side_, and Better Auth's limiter — like its other
request-shaped guards — only engages for calls carrying a real `ctx.request`. Both endpoints were
therefore completely unthrottled: one sends email, the other checks tokens, and anyone could reach
them. Each now has two buckets, because either alone is porous — one on the client address, one on
the thing an attacker can't rotate freely (the target address, or the token being retried). Every
bucket is consumed on each request rather than short-circuiting on the first failure, so tripping
one limit can't keep another permanently fresh.

`RateLimiter` and `clientAddress` are exported from `@aphexcms/cms-core/server` for apps adding
their own unauthenticated endpoints. Stated plainly: it is per-process memory, so behind N
instances the effective limit is N× what's configured and a restart forgets every window. It turns
"unlimited" into "bounded per instance", which is the difference between an email bomb and a
nuisance; a deployment needing a hard guarantee should put a limiter in front of the app.

**API-key deletion is gated on `apiKey.manage`**, the same capability that gates issuing one.
It previously checked an inline role list that happened to include `editor`, so the two halves of
the same permission disagreed. **Editors lose the ability to delete API keys** — if you were
relying on that, grant `apiKey.manage` to the editor role.
