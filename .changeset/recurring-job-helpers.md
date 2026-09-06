---
'@aphexcms/cms-core': minor
---

Add `ensureRecurringJob` / `scheduleNextTick` for recurring work

There is still no "recurring job" row type, and deliberately so: a repeating job is a
_chain_, where each tick's handler enqueues the next before returning. That keeps one
mechanism instead of two — a tick is an ordinary job, so it inherits leases, backoff,
dead-lettering and the Activity view — and lets a chain switch itself off per
environment by simply not rescheduling.

What was missing was a correct way to _start_ one. Both halves are quiet to get wrong,
because every tick a dead chain doesn't run is a thing that silently doesn't happen and
nothing in the UI reports:

- `ensureRecurringJob(adapter, { organizationId, type, runAt?, ... })` starts a chain
  only if one isn't already running, deciding on **liveness** (`pending` or `leased`)
  rather than an idempotency key. The keyed version looks right and fails later: the
  bootstrap job completes immediately — that being the point — after which every arming
  call gets that finished row back and no-ops, so a chain that dies can never be revived
  while the arming call still reports success. Liveness answers correctly in both
  directions: never a second live chain, always a revived dead one. Safe to call on any
  path implying the feature is in use (a settings panel opening, a manual sync).
- `scheduleNextTick(adapter, job, { intervalMs })` continues a chain from inside the
  handler, inheriting the running job's organization, type and attempt budget, and
  enqueuing without a key (a key would collapse every tick onto one row). The interval
  is measured from completion, so a chain that falls behind spaces out rather than
  firing a catch-up burst.

Both are exported from `@aphexcms/cms-core/server`.
