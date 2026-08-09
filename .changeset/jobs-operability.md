---
'@aphexcms/cms-core': minor
'@aphexcms/postgresql-adapter': minor
'@aphexcms/sqlite-adapter': minor
---

Make the activity page operable, not just observable.

The job/event history was already there; what was missing was the ability to act on what it
showed. A dead-lettered job could be read but not restarted, and a stalled relay was invisible —
the queue simply looked idle, which is exactly what a healthy queue looks like too.

- **Retry and cancel**, gated on the `org.settings` capability. Both are guarded in SQL rather
  than by a read-then-write: a job another worker leases in between stops matching the `WHERE`
  and the action reports a conflict instead of racing the settle.
- **Relay backlog banner** — pending outbox count and the age of the oldest unprocessed row.
  This is the "is the worker running?" signal; without it an unrun relay is indistinguishable
  from no work.
- **Instance-wide scope** for super admins, so a single organization's view isn't the only way
  to find a job.
- `ActivityView` is exported from `@aphexcms/cms-core/client/ui` (the narrow barrel — it's plain
  fetch and tables, and belongs nowhere near the field-editor chunk).

**`EventJobAdapter` gained three required methods**, so a third-party adapter will not compile
until it implements them. Both first-party adapters do.

- `outboxHealth({ organizationId? })` — backlog size and oldest pending timestamp. Omit the org
  for the instance-wide figure.
- `getJob(organizationId, id)` — single job read, so a caller can tell "gone" from "not allowed".
- `requeueJob(organizationId, id, { runAt })` — the operator's undo for a dead letter.

`requeueJob` is deliberately separate from `retryJob` rather than a reuse of it. `retryJob` is the
_runner's_ backoff transition and leaves `attempts` untouched; a dead-lettered job sits at
`attempts === maxAttempts`, so handing it back through that path would only re-exhaust it on the
next claim. `requeueJob` resets the attempt counter and clears `lastError`, and is restricted to
`failed` and `cancelled` — requeueing a `pending` job is a no-op and requeueing a `leased` one
would race its current owner.
