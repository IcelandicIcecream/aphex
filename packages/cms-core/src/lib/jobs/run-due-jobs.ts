// The job runner: claim a bounded batch of due jobs, run each type's handler, and
// settle it — complete on success, retry-with-backoff while attempts remain, or
// dead-letter once they're exhausted. This is the only place the backoff/max-attempts
// *policy* lives; the adapter just performs the state transitions it's told to.
//
// It runs ONE batch and returns — it does not loop. The caller (the protected worker
// endpoint, driven by platform cron or a self-hosted poll loop) decides cadence.
import type { DatabaseAdapter } from '../db/interfaces/index';
import type { Logger } from '../utils/logger';
import type { JobHandlerMap } from './types';

export interface RunDueJobsOptions {
	databaseAdapter: DatabaseAdapter;
	handlers: JobHandlerMap;
	logger: Logger;
	/** Identifies the lease owner in `cms_jobs.lease_owner` (for crash-recovery visibility). */
	workerId: string;
	/** Scope to one tenant; omit to claim across all orgs (worker context, override access). */
	organizationId?: string;
	/** Max jobs claimed this batch. Default 10. */
	batchSize?: number;
	/** Lease duration (ms) before a claimed-but-unfinished job is reclaimable. Default 30000. */
	leaseMs?: number;
	/** First-retry delay (ms); doubles per attempt. Default 1000. */
	baseBackoffMs?: number;
	/** Backoff ceiling (ms). Default 1h. */
	maxBackoffMs?: number;
	/** Injectable clock (tests). Default `new Date()`. */
	now?: Date;
}

export interface RunDueJobsResult {
	claimed: number;
	completed: number;
	retried: number;
	failed: number;
}

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_LEASE_MS = 30_000;
const DEFAULT_BASE_BACKOFF_MS = 1_000;
const DEFAULT_MAX_BACKOFF_MS = 60 * 60 * 1_000;

/**
 * Exponential backoff with jitter. `attempts` is 1-based (the claim already bumped it),
 * so the first retry waits ~base, the second ~2×base, capped at `max`. Up to 25% of
 * extra jitter spreads retries so a batch that failed together doesn't re-thunder as one.
 */
function backoffMs(attempts: number, base: number, max: number): number {
	const exp = Math.min(max, base * 2 ** (attempts - 1));
	const jitter = Math.random() * exp * 0.25;
	return Math.min(max, exp + jitter);
}

export async function runDueJobs(options: RunDueJobsOptions): Promise<RunDueJobsResult> {
	const { databaseAdapter, handlers, logger, workerId, organizationId } = options;
	const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
	const leaseMs = options.leaseMs ?? DEFAULT_LEASE_MS;
	const baseBackoffMs = options.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS;
	const maxBackoffMs = options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
	const now = options.now ?? new Date();

	const claimed = await databaseAdapter.claimDueJobs({
		organizationId,
		limit: batchSize,
		workerId,
		leaseMs,
		now
	});

	const result: RunDueJobsResult = {
		claimed: claimed.length,
		completed: 0,
		retried: 0,
		failed: 0
	};

	for (const job of claimed) {
		const handler = handlers[job.type];

		// Unknown type can never become runnable — dead-letter it now rather than burn retries.
		if (!handler) {
			logger.error(
				'[jobs]',
				`No handler registered for job type "${job.type}" (job ${job.id}); dead-lettering.`
			);
			await databaseAdapter.failJob(job.organizationId, job.id, {
				error: `No handler registered for job type "${job.type}"`
			});
			result.failed++;
			continue;
		}

		try {
			await handler({ job, databaseAdapter, logger });
			await databaseAdapter.completeJob(job.organizationId, job.id);
			result.completed++;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			// `attempts` was incremented by the claim, so it already counts this run.
			if (job.attempts >= job.maxAttempts) {
				logger.error(
					'[jobs]',
					`Job ${job.id} (${job.type}) failed permanently after ${job.attempts}/${job.maxAttempts} attempts: ${message}`
				);
				await databaseAdapter.failJob(job.organizationId, job.id, { error: message });
				result.failed++;
			} else {
				const delay = backoffMs(job.attempts, baseBackoffMs, maxBackoffMs);
				const runAt = new Date(now.getTime() + delay);
				logger.warn(
					'[jobs]',
					`Job ${job.id} (${job.type}) failed (attempt ${job.attempts}/${job.maxAttempts}); retrying in ${Math.round(delay)}ms: ${message}`
				);
				await databaseAdapter.retryJob(job.organizationId, job.id, { runAt, error: message });
				result.retried++;
			}
		}
	}

	return result;
}
