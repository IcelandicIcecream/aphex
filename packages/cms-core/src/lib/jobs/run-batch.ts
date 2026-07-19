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
import type { JobHandlerMap } from './types';
import { runDueJobs, type RunDueJobsResult } from './run-due-jobs';
import { relayOutbox, type RelayOutboxResult } from './relay';
import { createDocumentJobHandlers } from './document-jobs';
import {
	consumerJobType,
	toConsumerJobHandler,
	type PluginSettingsReader
} from '../events/consumer';

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
	/** Injected into event-consumer deliveries so a consumer can read its own decrypted settings. */
	pluginSettingsService: PluginSettingsReader;
}

export interface RunJobsBatchOptions {
	/** Lease-owner label written to `cms_jobs.lease_owner` (crash-recovery visibility). */
	workerId?: string;
	/** Scope to one tenant; omit to claim across all orgs (worker context, override access). */
	organizationId?: string;
}

/** One tick's combined outcome: the relay fan-out plus the job execution that followed. */
export interface RunJobsBatchResult extends RunDueJobsResult {
	/** Outbox fan-out done at the top of this tick (events → delivery jobs). */
	relay: RelayOutboxResult;
}

/**
 * Run one full worker tick: relay the outbox, then run one bounded batch of due jobs with the
 * fully-assembled handler map.
 *
 * Relaying FIRST means a delivery job an event spawns this tick is already `pending` when the
 * job pass runs, so a just-published document's consumers can fire in the same tick rather than
 * waiting for the next — at the cost of nothing, since a slow consumer is still its own job.
 *
 * Handler precedence (later wins): core's built-in handlers (scheduled publish/unpublish) →
 * plugin event-consumer deliveries (`aphex/consumer:<id>`) → plugin job handlers
 * (`aphex/job/handler`) → the app's `config.jobs.handlers`. So an app can override a plugin,
 * and a plugin can override a built-in — the app always has the final say. Consumer delivery
 * types are namespaced, so they can't actually collide with the others.
 */
export async function runJobsBatch(
	services: JobRunnerServices,
	options: RunJobsBatchOptions = {}
): Promise<RunJobsBatchResult> {
	const { config, databaseAdapter, logger, localAPI, partResolver, pluginSettingsService } =
		services;

	const relay = await relayOutbox(services, {
		organizationId: options.organizationId,
		batchSize: config.jobs?.relayBatchSize
	});

	// Turn each registered consumer into a delivery job handler, keyed by its reserved job type.
	// Built here (not in the resolver) because the wrapper injects live services — the settings
	// reader that lets a consumer read its own decrypted config.
	const consumerHandlers: JobHandlerMap = {};
	for (const consumer of partResolver.eventConsumers()) {
		consumerHandlers[consumerJobType(consumer.id)] = toConsumerJobHandler(consumer.handler, {
			pluginSettingsService
		});
	}

	const jobs = await runDueJobs({
		databaseAdapter,
		handlers: {
			...createDocumentJobHandlers({ localAPI }),
			...consumerHandlers,
			...partResolver.jobHandlers(),
			...(config.jobs?.handlers ?? {})
		},
		logger,
		workerId: options.workerId ?? `runner-${randomUUID()}`,
		organizationId: options.organizationId,
		batchSize: config.jobs?.batchSize,
		leaseMs: config.jobs?.leaseMs
	});

	return { ...jobs, relay };
}
