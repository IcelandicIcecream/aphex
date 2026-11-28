---
'@aphexcms/cms-core': patch
---

`scheduleNextTick()` returns the existing next tick instead of adding a second one. A handler that reschedules in `finally` forked its chain on every failed attempt, because the queue retries the same job, whose successor already existed. One two-hour outage took an hourly sync to 125 runs an hour. Its `adapter` argument now needs `listJobs` as well as `scheduleJob`, the same as `ensureRecurringJob()`.
