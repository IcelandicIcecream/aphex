// Event + job ports. Relational adapters (postgres/pglite/sqlite) implement these.
// `appendEvent` and `scheduleJob` are callable on the tx handle from `withTransaction`,
// which is what makes emitting an event / scheduling a job atomic with the state change.
import type {
	DomainEvent,
	AppendEventInput,
	Job,
	ScheduleJobInput,
	ClaimJobsOptions,
	ListEventsOptions,
	ListJobsOptions,
	OutboxRow,
	ListUnprocessedOutboxOptions,
	OutboxHealth,
	Page
} from '../../types/events';

/**
 * The durable spine: an append-only domain-event log plus a DB-backed job queue.
 * All rows are organization-scoped. (The event-log read API — `listEvents` — lands
 * with the admin history view in a later slice; there's no reader for it yet.)
 */
export interface EventJobAdapter {
	// --- EventStore ---
	/**
	 * Append an immutable domain event AND its outbox worklist row, in one insert path.
	 * Call on the tx handle (inside `withTransaction`) so both commit atomically with the
	 * state change that caused them — the transactional-outbox guarantee. The outbox row is
	 * always written (even with no subscribers today): the relay decides fan-out at run time,
	 * so emission can't know whether anyone is listening.
	 */
	appendEvent(input: AppendEventInput): Promise<DomainEvent>;
	/** Read a single event by id (org-scoped). */
	getEvent(organizationId: string, id: string): Promise<DomainEvent | null>;
	/** List domain events for the org, newest first (read-only history / observability). */
	listEvents(options: ListEventsOptions): Promise<Page<DomainEvent>>;

	// --- Outbox (relay worklist) ---
	/**
	 * Read pending outbox rows (`processedAt IS NULL`), oldest first — the relay's input.
	 * No claim/lease: fan-out is idempotent (per event×consumer job key), so concurrent
	 * relays are safe. Omit `organizationId` to read across all orgs (worker context).
	 */
	listUnprocessedOutbox(options: ListUnprocessedOutboxOptions): Promise<OutboxRow[]>;
	/** Stamp `processedAt` once an outbox row has been fanned out to every subscriber. */
	markOutboxProcessed(organizationId: string, id: string): Promise<void>;
	/**
	 * Size and age of the unprocessed backlog — the "is the relay running?" signal.
	 * Omit `organizationId` for the instance-wide figure. See {@link OutboxHealth}.
	 */
	outboxHealth(options: { organizationId?: string }): Promise<OutboxHealth>;

	// --- JobStore ---
	/** Schedule a job. Idempotent when `idempotencyKey` is set: a duplicate key returns the existing job. */
	scheduleJob(input: ScheduleJobInput): Promise<Job>;
	/**
	 * Atomically claim up to `limit` due jobs with a lease, incrementing `attempts`.
	 * Claims jobs that are `pending` and due, or `leased` with an expired lease (crash recovery).
	 */
	claimDueJobs(options: ClaimJobsOptions): Promise<Job[]>;
	/** Mark a claimed job completed. */
	completeJob(organizationId: string, id: string): Promise<void>;
	/**
	 * Reschedule a claimed job for a later retry (backoff). Status → `pending`, `runAt`
	 * moves forward, the error is recorded, the lease is cleared. The backoff/max-attempts
	 * *policy* lives in the core runner; this is just the state transition.
	 */
	retryJob(
		organizationId: string,
		id: string,
		options: { runAt: Date; error: string }
	): Promise<void>;
	/** Dead-letter a claimed job: status → `failed`, record the error, clear the lease. */
	failJob(organizationId: string, id: string, options: { error: string }): Promise<void>;
	/** Cancel a job (e.g. a scheduled publish the user called off): status → `cancelled`, clear the lease. */
	cancelJob(organizationId: string, id: string): Promise<void>;
	/** Read a single job by id (org-scoped). Null when it doesn't exist in that org. */
	getJob(organizationId: string, id: string): Promise<Job | null>;
	/**
	 * Put a finished job back on the queue by hand — the operator's undo for a dead letter.
	 *
	 * Distinct from `retryJob`, which is the *runner's* backoff transition and deliberately
	 * leaves `attempts` alone. A dead-lettered job sits at `attempts === maxAttempts`, so
	 * reusing `retryJob` would hand it back to the runner only for the next claim to exhaust
	 * it again immediately. This resets the attempt counter and clears `lastError`, giving
	 * the job a fresh budget once whatever broke has been fixed.
	 *
	 * Guarded to `failed` and `cancelled` in SQL: requeueing a `pending` job is pointless and
	 * requeueing a `leased` one would race the worker currently holding it, whose settle would
	 * then overwrite the status. Returns the updated job, or null when the id doesn't exist in
	 * the org or wasn't in a requeueable state — so callers can tell "gone" from "not allowed"
	 * with a follow-up `getJob`.
	 */
	requeueJob(organizationId: string, id: string, options: { runAt: Date }): Promise<Job | null>;
	/** List jobs, newest first (read-only history / observability). Omit `organizationId` for instance-wide. */
	listJobs(options: ListJobsOptions): Promise<Page<Job>>;
}
