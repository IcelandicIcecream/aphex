---
'@aphexcms/cms-core': minor
---

Add `checkHealth` for the app's `/healthz` probe route

Deployment platforms want a readiness probe, and the honest version of one is more than
`await adapter.isHealthy()`. `checkHealth(locals.aphexCMS)` returns `{ ok, db, storage }`
with the three decisions already made:

- **A check that throws is unhealthy, not a 500.** Adapters reject on a dead socket or
  expired bucket credentials. A probe that lets the rejection through reports "the app is
  broken" when the truthful answer is "a dependency is down".
- **A check that hangs is unhealthy too.** This is the one a hand-written probe misses:
  `isHealthy()` on a wedged connection can hang indefinitely, and the probe hangs with it
  until the platform's own timeout fires. Each check races a 5s bound (configurable via
  `timeoutMs`), and the checks run concurrently, so the call costs the slowest one rather
  than their sum.
- **The result stays coarse.** The endpoint is public and unauthenticated, so it reports
  booleans — no driver strings, no connection URLs.

It returns a result rather than a `Response`, so the app keeps the HTTP shape and can add
its own checks or gate the route. The route itself stays in the app, where it can be
customized:

```ts
// src/routes/healthz/+server.ts
import { json } from '@sveltejs/kit';
import { checkHealth } from '@aphexcms/cms-core/server';

export const GET = async ({ locals }) => {
	const health = await checkHealth(locals.aphexCMS);
	return json(health, { status: health.ok ? 200 : 503 });
};
```

503 rather than 500 on failure — the process is alive but not ready to serve, which is what
tells an orchestrator to stop routing traffic without recycling the container.
