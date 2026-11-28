// Job handler surface. A handler runs a single claimed job by type; the runner
// (`runDueJobs`) owns claim/lease/complete/retry/dead-letter — a handler only does
// the work and either returns (success) or throws (retryable/failed).
import type { DatabaseAdapter } from '../db/interfaces/index';
import type { Job } from '../types/events';
import type { Logger } from '../utils/logger';
import type { LocalAPI } from '../local-api/index';
import type { EmailAdapter } from '../email/interfaces/email';

/** What a job handler receives. `databaseAdapter` is the live adapter (org-scoped calls still take an org id). */
export interface JobContext {
	job: Job;
	databaseAdapter: DatabaseAdapter;
	logger: Logger;
	/**
	 * The Local API, for a job that creates or changes documents (with their hooks,
	 * validation and versions) rather than writing rows. Use `systemContext(job.organizationId)`.
	 * `null` only when `runDueJobs` is called without one, as in tests.
	 */
	localAPI: LocalAPI | null;
	/** The app's email adapter, or `null` when email isn't configured. Skip, don't throw, when it's `null`. */
	emailAdapter: EmailAdapter | null;
	/**
	 * Gives documents' images their URLs (`injectAssetUrls`), for a job that renders
	 * something with them, such as an email with the workspace's logo. `null` when
	 * `runDueJobs` is called without one, as in tests.
	 */
	assetService: JobAssetService | null;
}

/** What a job may do with assets: hydrate the images in documents it renders. */
export interface JobAssetService {
	injectAssetUrls(organizationId: string, ...docs: unknown[]): Promise<void>;
}

/**
 * Runs one job. Resolve to complete it; throw to signal failure — the runner
 * then retries with backoff (attempts remain) or dead-letters it (attempts exhausted).
 * Handlers must be idempotent: at-least-once delivery means a job can run more than once.
 */
export type JobHandler = (ctx: JobContext) => Promise<void>;

/** Map of job `type` → handler. A claimed job whose type has no handler is dead-lettered. */
export type JobHandlerMap = Record<string, JobHandler>;
