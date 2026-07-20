// Event consumers — the "react to a fact" surface. A consumer subscribes to one or more
// domain-event types and runs when they fire. It is NOT called inline at emit time: the
// relay turns each event into a durable delivery *job* (one per subscribed consumer), and
// the ordinary job runner executes it — so a consumer inherits retries, backoff, and
// dead-lettering for free, and a slow/failing consumer never blocks the write that emitted
// the event.
//
// This module is the bridge between the two halves: `EventConsumerHandler` is what a plugin
// author writes; `toConsumerJobHandler` adapts it to a `JobHandler` the runner understands,
// and `consumerJobType` is the reserved job-type namespace the relay enqueues under.
import { z } from 'zod';
import type { DatabaseAdapter } from '../db/interfaces/index';
import type { EmailAdapter } from '../email/interfaces/email';
import type { Logger } from '../utils/logger';
import type { JobHandler } from '../jobs/types';

/**
 * The event as a consumer sees it — the immutable fields of the `cms_domain_events` row that
 * triggered this delivery. `id` is the event's id (stable across retries of the same
 * delivery), so a consumer can dedupe on it if its side effect isn't naturally idempotent.
 */
export interface ConsumedEvent {
	id: string;
	type: string;
	organizationId: string;
	payload: Record<string, unknown>;
	correlationId: string | null;
	causationId: string | null;
	createdBy: string | null;
	createdAt: Date;
}

/**
 * Reads a plugin's resolved, **decrypted** per-org settings — bound to the triggering event's
 * organization, so a consumer can pull its own config (connection details, `secret` fields like
 * API keys) without threading org ids around. `pluginId` is the settings declaration's id (the
 * plugin's package name); an author reading their own plugin's settings passes their own id.
 * The `.get(orgId, pluginId)` on the host's PluginSettingsService satisfies this structurally.
 */
export interface PluginSettingsReader {
	get(organizationId: string, pluginId: string): Promise<Record<string, unknown>>;
}

/** The consumer-facing settings accessor — already scoped to the event's org. */
export interface ConsumerSettingsReader {
	/** Decrypted settings for `pluginId` in the event's organization ({} if never configured). */
	get(pluginId: string): Promise<Record<string, unknown>>;
}

/** What an event-consumer handler receives. `databaseAdapter` is the live adapter (org-scoped calls take an org id). */
export interface EventConsumerContext {
	event: ConsumedEvent;
	databaseAdapter: DatabaseAdapter;
	logger: Logger;
	/** Read this plugin's own decrypted settings for the event's org (e.g. a webhook URL secret). */
	settings: ConsumerSettingsReader;
	/**
	 * The configured email adapter, or `null` when the app has no email configured. A consumer that
	 * sends notifications (e.g. a form's "new submission" email) must handle `null` — treat it as
	 * "email disabled" and skip, never throw, so a missing key doesn't dead-letter the delivery.
	 */
	emailAdapter: EmailAdapter | null;
}

/** Runtime services the consumer wrapper injects into each delivery's context. */
export interface ConsumerHandlerDeps {
	pluginSettingsService: PluginSettingsReader;
	/** The app's email adapter (or `null` if email isn't configured). Passed straight to the consumer. */
	emailAdapter?: EmailAdapter | null;
}

/**
 * Runs when a subscribed event fires. Resolve to ack the delivery; throw to retry it (with
 * backoff, until the delivery job's attempts are exhausted, then dead-letter). MUST be
 * idempotent: at-least-once delivery means it can run more than once for the same event.
 */
export type EventConsumerHandler = (ctx: EventConsumerContext) => Promise<void>;

/**
 * Reserved job-type prefix for consumer deliveries. Namespaced so a delivery job can never
 * collide with a document job or a plugin's own `aphex/job/handler` type. The relay enqueues
 * `consumerJobType(id)`; the resolver registers the matching handler under the same key.
 */
export const CONSUMER_JOB_PREFIX = 'aphex/consumer:';

/** The delivery job type for a consumer id. */
export function consumerJobType(consumerId: string): string {
	return `${CONSUMER_JOB_PREFIX}${consumerId}`;
}

/**
 * The delivery job's payload envelope. The relay serializes the triggering event into this
 * shape; `toConsumerJobHandler` parses it back out — parsing (not casting) so a malformed
 * payload fails loudly at the handler boundary rather than reaching consumer code as `any`.
 * `createdAt` crosses the DB as a JSON string and is coerced back to a `Date`.
 */
const deliveryEnvelope = z.object({
	event: z.object({
		id: z.string(),
		type: z.string(),
		organizationId: z.string(),
		payload: z.record(z.string(), z.unknown()).default({}),
		correlationId: z.string().nullable().default(null),
		causationId: z.string().nullable().default(null),
		createdBy: z.string().nullable().default(null),
		createdAt: z.coerce.date()
	})
});

/** Build the delivery job payload for an event (the relay's side of the envelope). */
export function toDeliveryPayload(event: ConsumedEvent): Record<string, unknown> {
	return {
		event: {
			id: event.id,
			type: event.type,
			organizationId: event.organizationId,
			payload: event.payload,
			correlationId: event.correlationId,
			causationId: event.causationId,
			createdBy: event.createdBy,
			createdAt: event.createdAt.toISOString()
		}
	};
}

/**
 * Adapt an `EventConsumerHandler` into a `JobHandler`. The runner calls the returned function
 * with a claimed delivery job; it reconstructs the `ConsumedEvent` from the job payload, binds
 * a settings reader to the event's org, and invokes the consumer. Throwing propagates to the
 * runner as a retryable failure. `deps` is injected by the runner (`runJobsBatch`), which is
 * where the live services live — the resolver only knows which consumers exist, not how to run them.
 */
export function toConsumerJobHandler(
	handler: EventConsumerHandler,
	deps: ConsumerHandlerDeps
): JobHandler {
	return async ({ job, databaseAdapter, logger }) => {
		const { event } = deliveryEnvelope.parse(job.payload);
		const settings: ConsumerSettingsReader = {
			get: (pluginId) => deps.pluginSettingsService.get(event.organizationId, pluginId)
		};
		await handler({
			event,
			databaseAdapter,
			logger,
			settings,
			emailAdapter: deps.emailAdapter ?? null
		});
	};
}
