import { and, eq, or, lt, lte, sql, inArray } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type {
	DomainEvent,
	AppendEventInput,
	Job,
	ScheduleJobInput,
	ClaimJobsOptions
} from '@aphexcms/cms-core/server';
import type { cmsSchema } from './schema';
import type { DomainEventRow, JobRow } from './schema';

type DB = LibSQLDatabase<typeof cmsSchema>;
type Tables = typeof cmsSchema;

const toEvent = (r: DomainEventRow): DomainEvent => ({
	id: r.id,
	organizationId: r.organizationId,
	type: r.type,
	payload: r.payload,
	correlationId: r.correlationId,
	causationId: r.causationId,
	createdBy: r.createdBy,
	createdAt: r.createdAt
});

const toJob = (r: JobRow): Job => ({
	id: r.id,
	organizationId: r.organizationId,
	type: r.type,
	payload: r.payload,
	status: r.status,
	runAt: r.runAt,
	attempts: r.attempts,
	maxAttempts: r.maxAttempts,
	leaseOwner: r.leaseOwner,
	leaseExpiresAt: r.leaseExpiresAt,
	lastError: r.lastError,
	idempotencyKey: r.idempotencyKey,
	correlationId: r.correlationId,
	causationId: r.causationId,
	createdBy: r.createdBy,
	createdAt: r.createdAt,
	updatedAt: r.updatedAt,
	completedAt: r.completedAt
});

/**
 * Event log + job queue on SQLite (libsql). Org isolation is WHERE-based (no RLS):
 * every read filters by organization_id and every write carries it. SQLite serializes
 * writes globally, so the two-step job claim can't interleave.
 */
export class SQLiteEventJobAdapter {
	constructor(
		private db: DB,
		private tables: Tables
	) {}

	async appendEvent(input: AppendEventInput): Promise<DomainEvent> {
		const [row] = await this.db
			.insert(this.tables.domainEvents)
			.values({
				organizationId: input.organizationId,
				type: input.type,
				payload: input.payload ?? {},
				correlationId: input.correlationId ?? null,
				causationId: input.causationId ?? null,
				createdBy: input.createdBy ?? null
			})
			.returning();
		if (!row) throw new Error('appendEvent: insert returned no row');
		return toEvent(row);
	}

	async getEvent(organizationId: string, id: string): Promise<DomainEvent | null> {
		const [row] = await this.db
			.select()
			.from(this.tables.domainEvents)
			.where(
				and(
					eq(this.tables.domainEvents.id, id),
					eq(this.tables.domainEvents.organizationId, organizationId)
				)
			)
			.limit(1);
		return row ? toEvent(row) : null;
	}

	async scheduleJob(input: ScheduleJobInput): Promise<Job> {
		// Idempotent enqueue: a repeated idempotencyKey returns the existing job.
		if (input.idempotencyKey) {
			const [existing] = await this.db
				.select()
				.from(this.tables.jobs)
				.where(
					and(
						eq(this.tables.jobs.organizationId, input.organizationId),
						eq(this.tables.jobs.idempotencyKey, input.idempotencyKey)
					)
				)
				.limit(1);
			if (existing) return toJob(existing);
		}
		const [row] = await this.db
			.insert(this.tables.jobs)
			.values({
				organizationId: input.organizationId,
				type: input.type,
				payload: input.payload ?? {},
				runAt: input.runAt ?? new Date(),
				maxAttempts: input.maxAttempts ?? 5,
				idempotencyKey: input.idempotencyKey ?? null,
				correlationId: input.correlationId ?? null,
				causationId: input.causationId ?? null,
				createdBy: input.createdBy ?? null
			})
			.returning();
		if (!row) throw new Error('scheduleJob: insert returned no row');
		return toJob(row);
	}

	async claimDueJobs(options: ClaimJobsOptions): Promise<Job[]> {
		const now = options.now ?? new Date();
		const leaseUntil = new Date(now.getTime() + options.leaseMs);
		const { jobs } = this.tables;

		// Claimable: pending and due, OR leased with an expired lease (crashed worker recovery).
		const claimable = or(
			and(eq(jobs.status, 'pending'), lte(jobs.runAt, now)),
			and(eq(jobs.status, 'leased'), lt(jobs.leaseExpiresAt, now))
		);
		const scoped = options.organizationId
			? and(eq(jobs.organizationId, options.organizationId), claimable)
			: claimable;

		const candidates = await this.db
			.select({ id: jobs.id })
			.from(jobs)
			.where(scoped)
			.orderBy(jobs.runAt)
			.limit(options.limit);
		const ids = candidates.map((c) => c.id);
		if (ids.length === 0) return [];

		const rows = await this.db
			.update(jobs)
			.set({
				status: 'leased',
				leaseOwner: options.workerId,
				leaseExpiresAt: leaseUntil,
				attempts: sql`${jobs.attempts} + 1`,
				updatedAt: now
			})
			// Re-apply the claimable guard so an already-leased row is skipped.
			.where(and(inArray(jobs.id, ids), claimable))
			.returning();
		return rows.map(toJob);
	}

	async completeJob(organizationId: string, id: string): Promise<void> {
		const now = new Date();
		await this.db
			.update(this.tables.jobs)
			.set({
				status: 'completed',
				completedAt: now,
				updatedAt: now,
				leaseOwner: null,
				leaseExpiresAt: null
			})
			.where(and(eq(this.tables.jobs.id, id), eq(this.tables.jobs.organizationId, organizationId)));
	}

	async retryJob(
		organizationId: string,
		id: string,
		options: { runAt: Date; error: string }
	): Promise<void> {
		await this.db
			.update(this.tables.jobs)
			.set({
				status: 'pending',
				runAt: options.runAt,
				lastError: options.error,
				leaseOwner: null,
				leaseExpiresAt: null,
				updatedAt: new Date()
			})
			.where(and(eq(this.tables.jobs.id, id), eq(this.tables.jobs.organizationId, organizationId)));
	}

	async failJob(organizationId: string, id: string, options: { error: string }): Promise<void> {
		await this.db
			.update(this.tables.jobs)
			.set({
				status: 'failed',
				lastError: options.error,
				leaseOwner: null,
				leaseExpiresAt: null,
				updatedAt: new Date()
			})
			.where(and(eq(this.tables.jobs.id, id), eq(this.tables.jobs.organizationId, organizationId)));
	}
}
