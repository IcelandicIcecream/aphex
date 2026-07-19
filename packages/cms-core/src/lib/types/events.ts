// Universal event + job types — dialect-agnostic shapes the adapters map their rows to.
// These mirror the `cms_domain_events` and `cms_jobs` tables but never depend on Drizzle.

/**
 * A durable business fact. Append-only: written once (typically inside the same
 * transaction as the state change that caused it) and never mutated. Payload carries
 * identifiers + intentional metadata only — never secrets or full document copies.
 */
export interface DomainEvent {
	id: string;
	organizationId: string;
	type: string;
	payload: Record<string, unknown>;
	correlationId: string | null;
	causationId: string | null;
	createdBy: string | null;
	createdAt: Date;
}

/** Input to append a domain event. */
export interface AppendEventInput {
	organizationId: string;
	type: string;
	payload?: Record<string, unknown>;
	correlationId?: string | null;
	causationId?: string | null;
	createdBy?: string | null;
}

export type JobStatus = 'pending' | 'leased' | 'completed' | 'failed' | 'cancelled';

/** A command to run now or later. Lifecycle: pending → leased → completed/failed/cancelled. */
export interface Job {
	id: string;
	organizationId: string;
	type: string;
	payload: Record<string, unknown>;
	status: JobStatus;
	runAt: Date;
	attempts: number;
	maxAttempts: number;
	leaseOwner: string | null;
	leaseExpiresAt: Date | null;
	lastError: string | null;
	idempotencyKey: string | null;
	correlationId: string | null;
	causationId: string | null;
	createdBy: string | null;
	createdAt: Date;
	updatedAt: Date;
	completedAt: Date | null;
}

/** Input to schedule a job. `idempotencyKey` (unique per org) makes enqueue safe to retry. */
export interface ScheduleJobInput {
	organizationId: string;
	type: string;
	payload?: Record<string, unknown>;
	runAt?: Date;
	maxAttempts?: number;
	idempotencyKey?: string | null;
	correlationId?: string | null;
	causationId?: string | null;
	createdBy?: string | null;
}

/**
 * Options for claiming due jobs with a lease. Omit `organizationId` to claim across all
 * orgs (worker context — runs with override access); provide it to scope to one tenant.
 */
export interface ClaimJobsOptions {
	organizationId?: string;
	limit: number;
	workerId: string;
	leaseMs: number;
	now?: Date;
}

/**
 * An outbox worklist row — the relay's unit of work. Written in the SAME transaction as
 * the `domain_events` row it mirrors (so it can never exist without its event, nor be
 * missed if the event committed), then drained by the relay: for each subscribed consumer
 * it enqueues one delivery job, then stamps `processedAt`.
 *
 * Kept SEPARATE from `cms_domain_events` on purpose. The event log is an immutable ledger;
 * this is a mutable, prunable worklist. And the relay claims rows by `processedAt IS NULL`
 * (status), never by log position — so an event whose transaction commits late (with an
 * early timestamp) is still picked up, which a cursor-scan over the append-only log would
 * silently skip. `eventType`/`payload` are denormalized here so the relay fans out from a
 * single-table read with no join back to the event log.
 */
export interface OutboxRow {
	id: string;
	organizationId: string;
	/** The `cms_domain_events` row this mirrors (FK; the canonical, immutable copy). */
	eventId: string;
	eventType: string;
	payload: Record<string, unknown>;
	correlationId: string | null;
	causationId: string | null;
	createdBy: string | null;
	createdAt: Date;
	/** Null until the relay has fanned this event out to every subscriber. */
	processedAt: Date | null;
}

/**
 * Options for reading the relay's pending work. Omit `organizationId` to read across all
 * orgs (worker context — runs with override access), mirroring `claimDueJobs`. No lease:
 * the relay's only side effect is idempotent job enqueue (keyed per event×consumer), so two
 * workers processing the same row can't double-deliver — the job's unique idempotency key
 * absorbs the duplicate. Oldest-first, so events relay in roughly causal order.
 */
export interface ListUnprocessedOutboxOptions {
	organizationId?: string;
	/** Max rows returned per relay pass. */
	limit: number;
}

/** A page of rows plus the unfiltered total, for offset pagination in the admin history views. */
export interface Page<T> {
	items: T[];
	total: number;
	limit: number;
	offset: number;
}

/** Query for the read-only event history. Newest first. */
export interface ListEventsOptions {
	organizationId: string;
	/** Filter by exact event type (e.g. `document.published`). */
	type?: string;
	limit?: number;
	offset?: number;
}

/** Query for the read-only job history. Newest first. */
export interface ListJobsOptions {
	organizationId: string;
	/** Filter by one status or several (e.g. only `failed`). */
	status?: JobStatus | JobStatus[];
	/** Filter by exact job type. */
	type?: string;
	limit?: number;
	offset?: number;
}
