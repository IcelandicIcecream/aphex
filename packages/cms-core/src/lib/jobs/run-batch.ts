// The shared job-runner seam. Both the protected HTTP endpoint
// (`POST /api/internal/workers/run`) and the embedded in-process poll loop call
// THIS — never `runDueJobs` directly — so the handler wiring (built-in document
// jobs + app-registered handlers) is constructed in exactly one place and can
// never drift between the two invocation modes.
//
// `runDueJobs` is the pure engine (claim → run → settle, one batch). This wrapper
// is the only thing that knows *which* handlers exist and pulls the per-run knobs
// off `CMSConfig.jobs`.
import { randomUUID } from 'node:crypto';
import type { DatabaseAdapter } from '../db/interfaces/index';
import type { Logger } from '../utils/logger';
import type { CMSConfig } from '../types/config';
import type { LocalAPI } from '../local-api/index';
import type { PartResolver } from '../plugins/resolver';
import { runDueJobs, type RunDueJobsResult } from './run-due-jobs';
import { createDocumentJobHandlers } from './document-jobs';

/**
 * The slice of the CMS service container the runner needs. Structurally a subset
 * of `CMSInstances`, so callers can pass `event.locals.aphexCMS` (or `c.var.aphexCMS`)
 * straight through — no adapter, no cast.
 */
export interface JobRunnerServices {
	config: CMSConfig;
	databaseAdapter: DatabaseAdapter;
	logger: Logger;
	localAPI: LocalAPI;
	partResolver: PartResolver;
}

export interface RunJobsBatchOptions {
	/** Lease-owner label written to `cms_jobs.lease_owner` (crash-recovery visibility). */
	workerId?: string;
	/** Scope to one tenant; omit to claim across all orgs (worker context, override access). */
	organizationId?: string;
}

/**
 * Run one bounded batch of due jobs with the fully-assembled handler map.
 *
 * Handler precedence (later wins): core's built-in handlers (scheduled publish/
 * unpublish) → plugin-contributed handlers (`aphex/job/handler` parts) → the app's
 * `config.jobs.handlers`. So an app can override a plugin, and a plugin can override
 * a built-in — the app always has the final say.
 */
export async function runJobsBatch(
	services: JobRunnerServices,
	options: RunJobsBatchOptions = {}
): Promise<RunDueJobsResult> {
	const { config, databaseAdapter, logger, localAPI, partResolver } = services;
	return runDueJobs({
		databaseAdapter,
		handlers: {
			...createDocumentJobHandlers({ localAPI }),
			...partResolver.jobHandlers(),
			...(config.jobs?.handlers ?? {})
		},
		logger,
		workerId: options.workerId ?? `runner-${randomUUID()}`,
		organizationId: options.organizationId,
		batchSize: config.jobs?.batchSize,
		leaseMs: config.jobs?.leaseMs
	});
}
