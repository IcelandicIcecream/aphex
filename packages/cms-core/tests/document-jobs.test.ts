/**
 * The built-in scheduled-publish handlers. These pin the routing: a `document.publish`
 * job resolves its collection from the payload and calls `publish()` as the system
 * (override access), and bad/unknown input throws (→ the runner fails/retries the job).
 * The publish-emits-`document.published` guarantee is covered by version-service.test.ts;
 * here we only assert the handler dispatches correctly.
 *
 * Lives in tests/ (not src/) so the package build never compiles it into dist.
 */
import { describe, it, expect, vi } from 'vitest';
import {
	createDocumentJobHandlers,
	DOCUMENT_PUBLISH_JOB,
	DOCUMENT_UNPUBLISH_JOB
} from '../src/lib/jobs/document-jobs';
import type { LocalAPI } from '../src/lib/local-api/index';
import type { Job } from '../src/lib/types/events';

function makeJob(payload: unknown): Job {
	return {
		id: 'job-1',
		organizationId: 'org-1',
		type: DOCUMENT_PUBLISH_JOB,
		payload: payload as Record<string, unknown>,
		status: 'leased',
		runAt: new Date(),
		attempts: 1,
		maxAttempts: 5,
		leaseOwner: 'w',
		leaseExpiresAt: new Date(),
		lastError: null,
		idempotencyKey: null,
		correlationId: null,
		causationId: null,
		createdBy: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		completedAt: null
	};
}

function fakeLocalAPI(collection: { publish: unknown; unpublish: unknown } | undefined) {
	return {
		getCollection: vi.fn(() => collection)
	} as unknown as LocalAPI;
}

describe('createDocumentJobHandlers', () => {
	it('publish handler resolves the collection and publishes as the system', async () => {
		const publish = vi.fn(async () => null);
		const localAPI = fakeLocalAPI({ publish, unpublish: vi.fn() });
		const handlers = createDocumentJobHandlers({ localAPI });

		await handlers[DOCUMENT_PUBLISH_JOB]!({
			job: makeJob({ documentId: 'doc-1', documentType: 'page' }),
			databaseAdapter: {} as never,
			logger: {} as never
		});

		expect(localAPI.getCollection as ReturnType<typeof vi.fn>).toHaveBeenCalledWith('page');
		const [ctx, id] = publish.mock.calls[0]!;
		expect(id).toBe('doc-1');
		// System context: scoped to the job's org, RLS overridden.
		expect(ctx).toMatchObject({ organizationId: 'org-1', overrideAccess: true });
	});

	it('unpublish handler routes to unpublish', async () => {
		const unpublish = vi.fn(async () => null);
		const localAPI = fakeLocalAPI({ publish: vi.fn(), unpublish });
		const handlers = createDocumentJobHandlers({ localAPI });

		await handlers[DOCUMENT_UNPUBLISH_JOB]!({
			job: {
				...makeJob({ documentId: 'doc-9', documentType: 'post' }),
				type: DOCUMENT_UNPUBLISH_JOB
			},
			databaseAdapter: {} as never,
			logger: {} as never
		});

		expect(unpublish.mock.calls[0]![1]).toBe('doc-9');
	});

	it('throws when the collection does not exist (→ job fails/retries)', async () => {
		const localAPI = fakeLocalAPI(undefined);
		const handlers = createDocumentJobHandlers({ localAPI });

		await expect(
			handlers[DOCUMENT_PUBLISH_JOB]!({
				job: makeJob({ documentId: 'doc-1', documentType: 'ghost' }),
				databaseAdapter: {} as never,
				logger: {} as never
			})
		).rejects.toThrow('Unknown collection "ghost"');
	});

	it('throws on a malformed payload (missing documentId)', async () => {
		const localAPI = fakeLocalAPI({ publish: vi.fn(), unpublish: vi.fn() });
		const handlers = createDocumentJobHandlers({ localAPI });

		await expect(
			handlers[DOCUMENT_PUBLISH_JOB]!({
				job: makeJob({ documentType: 'page' }),
				databaseAdapter: {} as never,
				logger: {} as never
			})
		).rejects.toThrow();
	});
});
