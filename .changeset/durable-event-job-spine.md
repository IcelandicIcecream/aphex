---
'@aphexcms/cms-core': minor
'@aphexcms/postgresql-adapter': minor
'@aphexcms/sqlite-adapter': minor
---

Add the durable event + job spine (Phase 1): an append-only domain-event log, a DB-backed job queue, and a transactional outbox — all cross-dialect (Postgres/pglite/SQLite).

**cms-core**

- `withTransaction` is now **required** on `DatabaseAdapter` (was optional). Both first-party adapters already implement it; this removes the non-atomic fallbacks in `VersionService`. Custom adapters must implement it.
- New `EventJobAdapter` port on `DatabaseAdapter`: `appendEvent` / `getEvent` (append-only event log) and `scheduleJob` / `claimDueJobs` / `completeJob` / `retryJob` / `failJob` (job queue with leases + idempotency keys). Callable on the tx handle from `withTransaction`, so emitting an event or scheduling a job is atomic with the state change that caused it (transactional outbox).
- `defineEvent(type, zodSchema)` — a typed event catalog helper (mirrors the API-contract pattern), plus the built-in `document.published` definition. New universal types: `DomainEvent`, `Job`, `AppendEventInput`, `ScheduleJobInput`, `ClaimJobsOptions`, etc.
- `create({ publish })` is now atomic: create + draft snapshot + publish + publish snapshot commit in one transaction instead of four separate implicit ones. `document.published` is emitted inside the publish transaction on every versioned publish path.
- **Job worker:** `runDueJobs()` — claims a bounded batch of due jobs, runs each type's registered handler, and settles it (complete / retry with exponential backoff + jitter / dead-letter after `maxAttempts`). Handlers and a shared `workerSecret` are configured via `CMSConfig.jobs`. A secret-gated `POST /api/internal/workers/run` endpoint drives one batch (404 when no secret is set, so it's never an unauthenticated surface by default); platform cron or a self-hosted poll loop calls it on a cadence.
- **Scheduled publish/unpublish:** built-in `document.publish` / `document.unpublish` job handlers, plus `collection.schedulePublish()` / `scheduleUnpublish()` (Local API) and `POST /api/documents/:id/schedule`. Scheduling is permission-checked at schedule time; the job re-runs `publish()` at `runAt` (re-validating + guarding references), so invalid content fails/retries instead of publishing, and `document.published` is emitted on the scheduled path exactly like a manual publish. **Replace semantics**: scheduling replaces any existing pending schedule for the document (at most one → no accidental double-publish), and `runAt` is floored to the minute. The editor has a calendar+time schedule dialog and a banner under the title ("Scheduled to be published on Monday at 8:00 AM") with reschedule/cancel, backed by `GET`/`DELETE /api/documents/:id/schedule` and the adapter `cancelJob` method.
- **Read-only history / observability:** `listEvents` / `listJobs` adapter methods + `GET /api/events` and `GET /api/jobs` (gated on `document.read`, paginated, filterable by type/status), surfaced in a top-level **Activity** admin view (`ActivityView`). Jobs and the domain-event log are queryable rows in your own DB — no external store.

**postgresql-adapter / sqlite-adapter**

- New `cms_domain_events` and `cms_jobs` tables (organization-scoped; RLS policies on Postgres, `WHERE`-based isolation on SQLite), and the `EventJobAdapter` implementation. **Requires a migration** on Postgres (`drizzle-kit generate` + `migrate`); SQLite picks the tables up via push-on-boot.
