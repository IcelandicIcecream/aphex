// Event + job ports. Relational adapters (postgres/pglite/sqlite) implement these.
// `appendEvent` and `scheduleJob` are callable on the tx handle from `withTransaction`,
// which is what makes emitting an event / scheduling a job atomic with the state change.
import type {
	DomainEvent,
	AppendEventInput,
	Job,
	ScheduleJobInput,
	ClaimJobsOptions
} from '../../types/events';

/**
 * The durable spine: an append-only domain-event log plus a DB-backed job queue.
 * All rows are organization-scoped. (The event-log read API — `listEvents` — lands
 * with the admin history view in a later slice; there's no reader for it yet.)
 */
export interface EventJobAdapter {
	// --- EventStore ---
	/** Append an immutable domain event. Call on the tx handle to make it atomic with a write. */
	appendEvent(input: AppendEventInput): Promise<DomainEvent>;
	/** Read a single event by id (org-scoped). */
	getEvent(organizationId: string, id: string): Promise<DomainEvent | null>;

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
}
