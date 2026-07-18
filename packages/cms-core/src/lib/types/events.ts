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
