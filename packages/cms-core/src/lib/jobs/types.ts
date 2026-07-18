// Job handler surface. A handler runs a single claimed job by type; the runner
// (`runDueJobs`) owns claim/lease/complete/retry/dead-letter — a handler only does
// the work and either returns (success) or throws (retryable/failed).
import type { DatabaseAdapter } from '../db/interfaces/index';
import type { Job } from '../types/events';
import type { Logger } from '../utils/logger';

/** What a job handler receives. `databaseAdapter` is the live adapter (org-scoped calls still take an org id). */
export interface JobContext {
	job: Job;
	databaseAdapter: DatabaseAdapter;
	logger: Logger;
}

/**
 * Runs one job. Resolve to complete it; throw to signal failure — the runner
 * then retries with backoff (attempts remain) or dead-letters it (attempts exhausted).
 * Handlers must be idempotent: at-least-once delivery means a job can run more than once.
 */
export type JobHandler = (ctx: JobContext) => Promise<void>;

/** Map of job `type` → handler. A claimed job whose type has no handler is dead-lettered. */
export type JobHandlerMap = Record<string, JobHandler>;
