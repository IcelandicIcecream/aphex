---
'@aphexcms/cms-core': minor
'@aphexcms/postgresql-adapter': minor
'@aphexcms/sqlite-adapter': minor
---

Add the durable event + job spine (Phase 1): an append-only domain-event log, a DB-backed job queue, and a transactional outbox — all cross-dialect (Postgres/pglite/SQLite).

**cms-core**

- `withTransaction` is now **required** on `DatabaseAdapter` (was optional). Both first-party adapters already implement it; this removes the non-atomic fallbacks in `VersionService`. Custom adapters must implement it.
- New `EventJobAdapter` port on `DatabaseAdapter`: `appendEvent` / `getEvent` (append-only event log) and `scheduleJob` / `claimDueJobs` / `completeJob` (job queue with leases + idempotency keys). Callable on the tx handle from `withTransaction`, so emitting an event or scheduling a job is atomic with the state change that caused it (transactional outbox).
- `defineEvent(type, zodSchema)` — a typed event catalog helper (mirrors the API-contract pattern), plus the built-in `document.published` definition. New universal types: `DomainEvent`, `Job`, `AppendEventInput`, `ScheduleJobInput`, `ClaimJobsOptions`, etc.
- `create({ publish })` is now atomic: create + draft snapshot + publish + publish snapshot commit in one transaction instead of four separate implicit ones. `document.published` is emitted inside the publish transaction on every versioned publish path.

**postgresql-adapter / sqlite-adapter**

- New `cms_domain_events` and `cms_jobs` tables (organization-scoped; RLS policies on Postgres, `WHERE`-based isolation on SQLite), and the `EventJobAdapter` implementation. **Requires a migration** on Postgres (`drizzle-kit generate` + `migrate`); SQLite picks the tables up via push-on-boot.
