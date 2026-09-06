---
'@aphexcms/postgresql-adapter': minor
'@aphexcms/sqlite-adapter': minor
'@aphexcms/cms-core': minor
---

Let `scheduleJob` revive a dead-lettered idempotency key

`scheduleJob`'s idempotency lookup ignored the job's status, so a key was a
permanent tombstone: once any row existed under it, every later enqueue returned
that row — including a `failed` one. Fix the handler, redeploy, re-enqueue, and
you silently got the dead letter back with no error, and the work never ran again.
Cancelled schedules were unrescheduleable for the same reason, and any job keyed
on a stable string was effectively one-shot.

`scheduleJob` now accepts `resurrect: true`, which resets an existing `failed` or
`cancelled` job to `pending` with a fresh attempt budget and the new call's
`payload`/`runAt`/`maxAttempts`. A `completed` job is still returned untouched —
not re-running finished work is what the key is for — and so are `pending` and
`leased` ones, so this can't stomp a job a worker is currently holding (the guard
is in the UPDATE, not a read-then-write).

Off by default, because whether a failure has been fixed is a question only the
caller can answer. Don't set it on a hot read path: a permanently broken job would
then be re-armed on every request. For that case the operator's route is
unchanged — `requeueJob`, surfaced as Retry in the Activity view.
