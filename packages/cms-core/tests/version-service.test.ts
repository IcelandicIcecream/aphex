/**
 * VersionService.publishTx is the single in-transaction chokepoint every versioned
 * publish path funnels through (create({publish}), update({publish}), publish()). These
 * tests pin the transactional-outbox behavior: a publish writes a 'publish' version
 * snapshot AND appends a `document.published` event, on the same (fake) tx handle — and
 * emits nothing when the publish is a no-op. The cross-dialect DB mechanics of appendEvent
 * itself are covered by the adapter conformance suite.
 *
 * Lives in tests/ (not src/) so the package build never compiles it into dist.
 * Run: pnpm -F @aphexcms/cms-core test
 */
import { describe, it, expect } from 'vitest';
import { VersionService } from '../src/lib/services/version-service';
import type { DatabaseAdapter } from '../src/lib/db/index';
import type { AppendEventInput } from '../src/lib/types/events';

function fakeTx(overrides: Record<string, unknown> = {}) {
	const events: AppendEventInput[] = [];
	const versions: Array<{ eventType: string }> = [];
	const tx = {
		async publishDoc(organizationId: string, documentId: string) {
			return {
				id: documentId,
				organizationId,
				type: 'post',
				status: 'published',
				publishedData: { title: 'Hello' },
				publishedHash: 'abc123',
				updatedBy: 'user-1'
			};
		},
		async createDocumentVersion(data: { eventType: string }) {
			versions.push(data);
			return { id: 'ver-1', versionNumber: 1 };
		},
		async appendEvent(input: AppendEventInput) {
			events.push(input);
			return {
				id: 'evt-1',
				createdAt: new Date(),
				correlationId: null,
				causationId: null,
				...input
			};
		},
		...overrides
	};
	// Test double: `as unknown as` deliberately skips the full DatabaseAdapter surface —
	// publishTx only touches publishDoc / createDocumentVersion / appendEvent.
	return { tx: tx as unknown as DatabaseAdapter, events, versions };
}

describe('VersionService.publishTx (transactional outbox)', () => {
	it('writes a publish snapshot and emits document.published with the right payload', async () => {
		const svc = new VersionService();
		const { tx, events, versions } = fakeTx();

		const result = await svc.publishTx(tx, 'org-1', 'doc-1');

		expect(result?.status).toBe('published');
		expect(versions).toHaveLength(1);
		expect(versions[0]?.eventType).toBe('publish');

		expect(events).toHaveLength(1);
		const [event] = events;
		expect(event?.type).toBe('document.published');
		expect(event?.organizationId).toBe('org-1');
		expect(event?.createdBy).toBe('user-1');
		expect(event?.payload).toEqual({
			documentId: 'doc-1',
			documentType: 'post',
			publishedHash: 'abc123'
		});
	});

	it('emits nothing when publishDoc is a no-op (document not found)', async () => {
		const svc = new VersionService();
		const { tx, events, versions } = fakeTx({ publishDoc: async () => null });

		const result = await svc.publishTx(tx, 'org-1', 'missing');

		expect(result).toBeNull();
		expect(versions).toHaveLength(0);
		expect(events).toHaveLength(0);
	});
});
