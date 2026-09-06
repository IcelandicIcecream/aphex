/**
 * The two halves of a recurring-job chain. These are thin over the adapter, so what's
 * worth pinning is the decision each one makes, not the plumbing:
 *
 *   - `ensureRecurringJob` asks about liveness, never an idempotency key — the key
 *     version silently no-ops once the bootstrap job completes, which is how a dead
 *     chain stays dead while the arming call reports success.
 *   - `scheduleNextTick` inherits the running job's identity and enqueues WITHOUT a
 *     key, because a key would collapse the whole chain onto one row.
 *
 * Lives in tests/ (not src/) so the package build never compiles it into dist.
 */
import { describe, it, expect, vi } from 'vitest';
import { ensureRecurringJob, scheduleNextTick } from '../src/lib/jobs/recurring';
import type { Job, JobStatus, ListJobsOptions, ScheduleJobInput } from '../src/lib/types/events';

const HEARTBEAT = 'plato.heartbeat';

function makeJob(overrides: Partial<Job> = {}): Job {
	return {
		id: 'job-1',
		organizationId: 'org-1',
		type: HEARTBEAT,
		payload: {},
		status: 'pending',
		runAt: new Date(),
		attempts: 0,
		maxAttempts: 5,
		leaseOwner: null,
		leaseExpiresAt: null,
		lastError: null,
		idempotencyKey: null,
		correlationId: null,
		causationId: null,
		createdBy: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		completedAt: null,
		...overrides
	};
}

/** An adapter whose `listJobs` returns whatever the stored jobs match. */
function fakeAdapter(stored: Job[] = []) {
	const listJobs = vi.fn(async (options: ListJobsOptions) => {
		const wanted = options.status
			? new Set<JobStatus>(Array.isArray(options.status) ? options.status : [options.status])
			: null;
		const items = stored.filter(
			(j) =>
				(!options.type || j.type === options.type) &&
				(!options.organizationId || j.organizationId === options.organizationId) &&
				(!wanted || wanted.has(j.status))
		);
		return {
			items: items.slice(0, options.limit ?? items.length),
			total: items.length,
			limit: 1,
			offset: 0
		};
	});
	const scheduleJob = vi.fn(async (input: ScheduleJobInput) =>
		makeJob({ id: 'new-job', ...input })
	);
	return { listJobs, scheduleJob };
}

describe('ensureRecurringJob', () => {
	it('starts a chain when none is running', async () => {
		const adapter = fakeAdapter([]);
		const runAt = new Date('2030-01-01T00:00:00Z');

		const result = await ensureRecurringJob(adapter, {
			organizationId: 'org-1',
			type: HEARTBEAT,
			runAt,
			payload: { reason: 'panel opened' }
		});

		expect(result.armed).toBe(true);
		expect(adapter.scheduleJob).toHaveBeenCalledTimes(1);
		const input = adapter.scheduleJob.mock.calls[0]?.[0];
		expect(input?.type).toBe(HEARTBEAT);
		expect(input?.runAt).toBe(runAt);
		// The whole point: no key. A keyed bootstrap returns its own completed row
		// forever and can never revive the chain it started.
		expect(input?.idempotencyKey).toBeUndefined();
	});

	it('does not start a second chain when one is pending or leased', async () => {
		for (const status of ['pending', 'leased'] as const) {
			const live = makeJob({ id: `live-${status}`, status });
			const adapter = fakeAdapter([live]);

			const result = await ensureRecurringJob(adapter, {
				organizationId: 'org-1',
				type: HEARTBEAT
			});

			expect(result.armed).toBe(false);
			// It hands back the job actually carrying the chain, so a caller can report on it.
			expect(result.job.id).toBe(`live-${status}`);
			expect(adapter.scheduleJob).not.toHaveBeenCalled();
		}
	});

	it('revives a chain whose jobs are all finished — the case a key cannot handle', async () => {
		// This is the shape that made TRC's schedules run "never": the bootstrap job
		// completed, its chain later died, and every re-arm no-opped on the completed row.
		const adapter = fakeAdapter([
			makeJob({ id: 'old-1', status: 'completed' }),
			makeJob({ id: 'old-2', status: 'failed' }),
			makeJob({ id: 'old-3', status: 'cancelled' })
		]);

		const result = await ensureRecurringJob(adapter, {
			organizationId: 'org-1',
			type: HEARTBEAT
		});

		expect(result.armed).toBe(true);
		expect(adapter.scheduleJob).toHaveBeenCalledTimes(1);
	});

	it('scopes liveness to the org and the type', async () => {
		// Another org's live chain, and this org's live chain of a *different* type,
		// must both fail to satisfy the guard.
		const adapter = fakeAdapter([
			makeJob({ id: 'other-org', organizationId: 'org-2', status: 'pending' }),
			makeJob({ id: 'other-type', type: 'walkin.roster', status: 'pending' })
		]);

		const result = await ensureRecurringJob(adapter, {
			organizationId: 'org-1',
			type: HEARTBEAT
		});

		expect(result.armed).toBe(true);
		expect(adapter.listJobs).toHaveBeenCalledWith(
			expect.objectContaining({ organizationId: 'org-1', type: HEARTBEAT })
		);
	});
});

describe('scheduleNextTick', () => {
	it('inherits the running job’s identity and enqueues a genuinely new job', async () => {
		const adapter = fakeAdapter();
		const running = makeJob({
			id: 'tick-7',
			status: 'leased',
			maxAttempts: 3,
			payload: { cursor: 'abc' }
		});
		const from = new Date('2030-01-01T00:00:00Z');

		await scheduleNextTick(adapter, running, { intervalMs: 60_000, from });

		const input = adapter.scheduleJob.mock.calls[0]?.[0];
		expect(input?.organizationId).toBe('org-1');
		expect(input?.type).toBe(HEARTBEAT);
		expect(input?.maxAttempts).toBe(3);
		// Payload carries forward unless overridden — a chain usually wants its own state.
		expect(input?.payload).toEqual({ cursor: 'abc' });
		expect(input?.runAt).toEqual(new Date('2030-01-01T00:01:00Z'));
		// A key here would collapse every tick onto one row and stop the chain dead.
		expect(input?.idempotencyKey).toBeUndefined();
	});

	it('measures the interval from completion, so a late chain spaces out instead of bursting', async () => {
		const adapter = fakeAdapter();
		// A tick that was due an hour ago and only just ran.
		const running = makeJob({ runAt: new Date(Date.now() - 3_600_000), status: 'leased' });

		const before = Date.now();
		await scheduleNextTick(adapter, running, { intervalMs: 60_000 });
		const input = adapter.scheduleJob.mock.calls[0]?.[0];

		// Next run is an interval from *now*, not an interval from the missed slot
		// (which would be in the past and fire immediately, then again, then again).
		expect(input?.runAt?.getTime()).toBeGreaterThanOrEqual(before + 60_000);
	});

	it('takes an explicit payload for the next tick', async () => {
		const adapter = fakeAdapter();
		const running = makeJob({ payload: { cursor: 'abc' } });

		await scheduleNextTick(adapter, running, { intervalMs: 1000, payload: { cursor: 'def' } });

		expect(adapter.scheduleJob.mock.calls[0]?.[0]?.payload).toEqual({ cursor: 'def' });
	});
});
