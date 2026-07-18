/**
 * runDueJobs is the job runner: claim a batch, run each type's handler, and settle it —
 * complete / retry-with-backoff / dead-letter. These tests pin the settlement policy with
 * a fake adapter that records which transition each job took. Backoff timing and the
 * cross-dialect claim mechanics are covered elsewhere (adapter conformance); here we only
 * assert *which* branch fires.
 *
 * Lives in tests/ (not src/) so the package build never compiles it into dist.
 * Run: pnpm -F @aphexcms/cms-core test
 */
import { describe, it, expect, vi } from 'vitest';
import { runDueJobs } from '../src/lib/jobs/run-due-jobs';
import type { JobHandlerMap } from '../src/lib/jobs/types';
import type { DatabaseAdapter } from '../src/lib/db/index';
import type { Job } from '../src/lib/types/events';
import type { Logger } from '../src/lib/utils/logger';

const silentLogger: Logger = {
	debug: () => undefined,
	info: () => undefined,
	warn: () => undefined,
	error: () => undefined
};

function makeJob(overrides: Partial<Job> = {}): Job {
	return {
		id: 'job-1',
		organizationId: 'org-1',
		type: 'document.publish',
		payload: { documentId: 'doc-1' },
		status: 'leased',
		runAt: new Date(),
		attempts: 1,
		maxAttempts: 5,
		leaseOwner: 'worker-1',
		leaseExpiresAt: new Date(Date.now() + 30_000),
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

/** Fake adapter exposing only the four methods runDueJobs calls, plus spies to assert transitions. */
function fakeAdapter(claimed: Job[]) {
	const completeJob = vi.fn(async () => undefined);
	const retryJob = vi.fn(async () => undefined);
	const failJob = vi.fn(async () => undefined);
	const adapter = {
		claimDueJobs: vi.fn(async () => claimed),
		completeJob,
		retryJob,
		failJob
	};
	return {
		adapter: adapter as unknown as DatabaseAdapter,
		completeJob,
		retryJob,
		failJob
	};
}

const baseOpts = (adapter: DatabaseAdapter, handlers: JobHandlerMap) => ({
	databaseAdapter: adapter,
	handlers,
	logger: silentLogger,
	workerId: 'w-test'
});

describe('runDueJobs', () => {
	it('completes a job whose handler resolves', async () => {
		const { adapter, completeJob, retryJob, failJob } = fakeAdapter([makeJob()]);
		const handler = vi.fn(async () => undefined);

		const result = await runDueJobs(baseOpts(adapter, { 'document.publish': handler }));

		expect(handler).toHaveBeenCalledOnce();
		expect(completeJob).toHaveBeenCalledWith('org-1', 'job-1');
		expect(retryJob).not.toHaveBeenCalled();
		expect(failJob).not.toHaveBeenCalled();
		expect(result).toEqual({ claimed: 1, completed: 1, retried: 0, failed: 0 });
	});

	it('retries (backoff) when the handler throws and attempts remain', async () => {
		const { adapter, completeJob, retryJob, failJob } = fakeAdapter([
			makeJob({ attempts: 1, maxAttempts: 5 })
		]);
		const handler = vi.fn(async () => {
			throw new Error('transient');
		});

		const result = await runDueJobs(baseOpts(adapter, { 'document.publish': handler }));

		expect(completeJob).not.toHaveBeenCalled();
		expect(failJob).not.toHaveBeenCalled();
		expect(retryJob).toHaveBeenCalledOnce();
		const [org, id, opts] = retryJob.mock.calls[0]!;
		expect(org).toBe('org-1');
		expect(id).toBe('job-1');
		expect(opts.error).toBe('transient');
		expect(opts.runAt).toBeInstanceOf(Date);
		expect(result.retried).toBe(1);
	});

	it('dead-letters when the handler throws on the final attempt', async () => {
		const { adapter, retryJob, failJob } = fakeAdapter([makeJob({ attempts: 5, maxAttempts: 5 })]);
		const handler = vi.fn(async () => {
			throw new Error('permanent');
		});

		const result = await runDueJobs(baseOpts(adapter, { 'document.publish': handler }));

		expect(retryJob).not.toHaveBeenCalled();
		expect(failJob).toHaveBeenCalledWith('org-1', 'job-1', { error: 'permanent' });
		expect(result.failed).toBe(1);
	});

	it('dead-letters a job whose type has no registered handler', async () => {
		const { adapter, failJob } = fakeAdapter([makeJob({ type: 'unknown.type' })]);

		const result = await runDueJobs(baseOpts(adapter, {}));

		expect(failJob).toHaveBeenCalledOnce();
		const [, , opts] = failJob.mock.calls[0]!;
		expect(opts.error).toContain('unknown.type');
		expect(result).toEqual({ claimed: 1, completed: 0, retried: 0, failed: 1 });
	});
});
