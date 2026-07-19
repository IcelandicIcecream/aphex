// The outbox relay — the nervous system between "a fact happened" and "work should exist".
//
// `runDueJobs` executes work that's already queued; it doesn't care where it came from. The
// relay is what decides, durably, that work SHOULD be queued in response to an event. It
// drains the outbox worklist (rows written atomically with each `appendEvent`), and for every
// subscribed consumer enqueues one delivery job — then stamps the row processed. The ordinary
// runner takes it from there.
//
// Delivery is exactly-once per (event, consumer) WITHOUT a lock: the enqueue carries an
// idempotency key of `evt:<eventId>:<consumerId>`, so if this pass crashes after enqueue but
// before the row is marked processed — or two workers relay the same row — the duplicate
// enqueue is absorbed by the jobs table's unique key. The enqueue+mark run in one transaction,
// so a marked-processed row always has its jobs, and vice versa.
import type { Logger } from '../utils/logger';
import type { DatabaseAdapter } from '../db/interfaces/index';
import type { PartResolver } from '../plugins/resolver';
import { consumerJobType, toDeliveryPayload, type ConsumedEvent } from '../events/consumer';

/** The slice of the service container the relay needs — a structural subset of `JobRunnerServices`. */
export interface RelayServices {
	databaseAdapter: DatabaseAdapter;
	logger: Logger;
	partResolver: PartResolver;
}

export interface RelayOutboxOptions {
	/** Scope to one tenant; omit to relay across all orgs (worker context, override access). */
	organizationId?: string;
	/** Max outbox rows drained this pass. Default 100 (fan-out is cheap; relay generously). */
	batchSize?: number;
}

export interface RelayOutboxResult {
	/** Outbox rows processed this pass. */
	relayed: number;
	/** Delivery jobs enqueued (deduped enqueues still count as one each). */
	enqueued: number;
}

const DEFAULT_RELAY_BATCH_SIZE = 100;

/**
 * Drain one bounded batch of the outbox, fanning each event out to its subscribed consumers.
 * Runs one pass and returns — the caller (the same tick as `runJobsBatch`) owns cadence.
 */
export async function relayOutbox(
	services: RelayServices,
	options: RelayOutboxOptions = {}
): Promise<RelayOutboxResult> {
	const { databaseAdapter, logger, partResolver } = services;
	const batchSize = options.batchSize ?? DEFAULT_RELAY_BATCH_SIZE;

	const rows = await databaseAdapter.listUnprocessedOutbox({
		organizationId: options.organizationId,
		limit: batchSize
	});

	const result: RelayOutboxResult = { relayed: 0, enqueued: 0 };

	for (const row of rows) {
		const consumers = partResolver.consumersForEvent(row.eventType);

		// A row with no subscribers is still marked processed — the relay's contract is "every
		// event is considered", not "every event produces a job". Nobody listening is a valid
		// outcome, and leaving it pending would re-scan it forever.
		const event: ConsumedEvent = {
			id: row.eventId,
			type: row.eventType,
			organizationId: row.organizationId,
			payload: row.payload,
			correlationId: row.correlationId,
			causationId: row.causationId,
			createdBy: row.createdBy,
			createdAt: row.createdAt
		};
		const payload = toDeliveryPayload(event);

		try {
			await databaseAdapter.withTransaction(async (tx) => {
				for (const consumer of consumers) {
					await tx.scheduleJob({
						organizationId: row.organizationId,
						type: consumerJobType(consumer.id),
						payload,
						// Exactly-once per (event, consumer): a repeated key returns the existing job.
						idempotencyKey: `evt:${row.eventId}:${consumer.id}`,
						maxAttempts: consumer.maxAttempts,
						correlationId: row.correlationId,
						// The event is the cause of every delivery it spawns — chain it for tracing.
						causationId: row.eventId,
						createdBy: row.createdBy
					});
				}
				await tx.markOutboxProcessed(row.organizationId, row.id);
			});
			result.relayed++;
			result.enqueued += consumers.length;
		} catch (err) {
			// Leave the row unprocessed; the next pass retries it. Idempotent enqueue makes a
			// partial failure safe to redo. Log and continue so one bad row can't stall the batch.
			const message = err instanceof Error ? err.message : String(err);
			logger.error(
				'[relay]',
				`Failed to relay event ${row.eventId} (${row.eventType}); will retry next pass: ${message}`
			);
		}
	}

	return result;
}
