// The embedded in-process job loop — the third way to drive the queue, alongside platform cron
// and the self-hosted poll loop. Instead of hitting `POST /api/internal/workers/run` over HTTP,
// it calls `runJobsBatch` directly on an interval from inside the running app. That makes the
// event/job spine work with ZERO setup: schedule a publish or emit `form.submitted` and the
// consumer fires a few seconds later, no second terminal and no `workerSecret`.
//
// Intended for local dev and single-instance self-hosting. For a horizontally-scaled deployment,
// leave it off and use the dedicated worker loop / cron so N app replicas don't each spin a loop
// (correctness holds either way — leases and the unique idempotency key make concurrent runners
// safe — but it's wasted work).
import type { JobRunnerServices, RunJobsBatchResult } from './run-batch';
import { runJobsBatch } from './run-batch';
import type { Logger } from '../utils/logger';

/** Handle for a running embedded loop. Call `stop()` to clear the interval. */
export interface EmbeddedJobRunner {
	stop(): void;
}

export interface EmbeddedJobRunnerOptions {
	/** Milliseconds between ticks. Default 3000. */
	intervalMs?: number;
	logger: Logger;
	/**
	 * Resolve the live services at tick time (rather than capturing them once), so a schema-HMR
	 * re-init that rebuilds the CMS instances is picked up automatically. Return `null` to skip a
	 * tick (e.g. the app hasn't finished initializing yet).
	 */
	getServices: () => JobRunnerServices | null;
}

/**
 * Start the loop. Ticks NEVER overlap: while a tick is in flight the next interval fire is
 * skipped, so a slow batch can't stack runs on top of each other. A thrown error in a tick is
 * logged and swallowed — the loop must survive a transient DB blip and keep going. The interval
 * is `unref`'d where supported so it never keeps the process alive on its own.
 */
export function startEmbeddedJobRunner(options: EmbeddedJobRunnerOptions): EmbeddedJobRunner {
	const intervalMs = options.intervalMs ?? 3000;
	const { logger, getServices } = options;

	let running = false;
	let stopped = false;

	const tick = async () => {
		if (running || stopped) return; // no overlap; nothing after stop()
		const services = getServices();
		if (!services) return; // not initialized yet — try again next interval
		running = true;
		try {
			const result: RunJobsBatchResult = await runJobsBatch(services, {
				workerId: 'embedded'
			});
			// Only surface a tick that actually did something, so an idle dev server stays quiet.
			if (result.claimed > 0 || result.relay.enqueued > 0) {
				logger.debug(
					`[jobs:embedded] relayed=${result.relay.enqueued} claimed=${result.claimed} completed=${result.completed} failed=${result.failed} retried=${result.retried}`
				);
			}
		} catch (error) {
			logger.error('[jobs:embedded] tick failed:', error);
		} finally {
			running = false;
		}
	};

	const handle = setInterval(tick, intervalMs);
	// Don't let the loop hold the process open by itself (Node/Bun); harmless where unsupported.
	(handle as { unref?: () => void }).unref?.();

	logger.info(`[jobs:embedded] in-process job loop started (every ${intervalMs}ms)`);

	return {
		stop() {
			stopped = true;
			clearInterval(handle);
		}
	};
}
