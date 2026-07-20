---
'@aphexcms/cms-core': minor
---

Add an embedded in-process job runner (`config.jobs.embedded`) — a third way to
drive the queue alongside platform cron and the self-hosted poll loop. It calls
`runJobsBatch` on an interval from inside the running app (no HTTP endpoint, no
worker secret), so scheduled publishes and event consumers run with zero setup.
Ideal for local dev and single-instance self-hosting; ticks never overlap and a
failing tick is logged and swallowed so the loop survives transient errors.
