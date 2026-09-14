---
'@aphexcms/auth': patch
'create-aphex': patch
---

Resolve the client IP behind a proxy, so rate limiting throttles per caller rather
than per endpoint.

Better Auth needs a client address to key its rate limiter on. Behind a proxy it
couldn't find one, fell back to a single shared bucket per path, and said so in the
log:

```
WARN [Better Auth]: Rate limiting could not determine a client IP and is falling back
to a single shared per-path bucket.
```

The consequence was easy to miss and worse than it sounds. The per-endpoint rules mean
what they say only when they are per-IP: `/request-password-reset` at 2 requests a
minute became **two requests a minute for the entire instance**. One person asking for
a reset locked everyone else out for a minute, and an attacker could hold that endpoint
shut indefinitely for the cost of two requests. The generic 100/minute allowance had
the same shape at larger scale. This affected every proxied deployment — Railway,
Render, Fly, Coolify, anything behind nginx — which is to say every hosted one.

`x-forwarded-for` is now trusted automatically when a platform that terminates TLS in
front of the container is detected (`RAILWAY_PUBLIC_DOMAIN`, `RENDER_EXTERNAL_URL`,
`FLY_APP_NAME`, `COOLIFY_URL` — the same signals the templates' `docker-entrypoint.sh`
already uses to derive `AUTH_URL`). `AUTH_IP_ADDRESS_HEADERS` names the header
explicitly for anything else, and `AphexAuthConfig.ipAddressHeaders` is the programmatic
equivalent.

It is deliberately **not** defaulted to `x-forwarded-for` everywhere. A forwarding
header is client-supplied on any request that reaches the app directly, so trusting one
on a directly-reachable deployment would let a caller choose their own IP and bypass
rate limiting completely. A shared bucket throttles too much; a spoofable header
throttles nothing. Presence of a platform variable is what makes the header
trustworthy — the app cannot be reached except through the proxy that wrote it.
