/**
 * Concurrency on a single-connection driver (pglite) with RLS enforced.
 *
 * The adapter serializes work on the one connection with a mutex, and rebinds
 * its sub-adapters to the held transaction so inner queries don't wait for a
 * second connection that will never come. The subtle part is deciding who is
 * allowed to skip that mutex: a sub-adapter re-entering from *inside* the
 * running callback must reuse the held transaction, but an unrelated concurrent
 * caller must not — it has to queue.
 *
 * That used to be an instance boolean, which can't tell those two apart. A
 * concurrent caller arriving mid-transaction rode a stranger's transaction, and
 * when that transaction committed, its `SET LOCAL app.organization_id` went with
 * it: the leaked caller's remaining queries evaluated the RLS policy against
 * `''` and blew up with `invalid input syntax for type uuid`. The same leak also
 * committed its writes on someone else's boundary, which is how a state change
 * and the outbox row that's supposed to be atomic with it end up on opposite
 * sides of a commit.
 *
 * These tests overlap operations against that machinery. Read the note on the
 * first one before trusting them as a regression guard for the leak itself —
 * `cache-benchmark.test.ts` is what actually reproduces it. What this file does
 * pin down is the compare-and-swap contract under concurrent writers, which
 * nothing else asserts.
 *
 * pglite-only by nature — pooled Postgres hands every caller its own connection.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { RevisionConflictError } from '@aphexcms/cms-core/server';
import { db } from '$lib/server/db';
import { TEST_ORG_ID } from './helpers/test-constants';

const isPglite = process.env.APHEX_DATABASE?.toLowerCase() === 'pglite';
const describeIfPglite = isPglite ? describe : describe.skip;

const createdIds: string[] = [];

async function makeDoc(title: string) {
	const doc = await db.createDocument({
		organizationId: TEST_ORG_ID,
		type: 'page',
		draftData: { title }
	});
	createdIds.push(doc.id);
	return doc;
}

afterAll(async () => {
	for (const id of createdIds) {
		await db.deleteDocById(TEST_ORG_ID, id).catch(() => undefined);
	}
});

describeIfPglite('single-connection RLS under concurrency', () => {
	let docIds: string[] = [];

	beforeAll(async () => {
		const docs = await Promise.all(Array.from({ length: 8 }, (_, i) => makeDoc(`Concurrent ${i}`)));
		docIds = docs.map((d) => d.id);
	}, 30000);

	it('overlapping reads keep their org context', async () => {
		// Staggered rather than a plain `Promise.all`, which fires everything before
		// the first transaction opens so every caller queues and nothing overlaps.
		//
		// Be clear about what this does NOT do: reverting the adapter fix leaves it
		// green. These operations finish in single-digit milliseconds, so even
		// staggered arrivals land between transactions rather than inside one. The
		// reproducer for the leak is `cache-benchmark.test.ts` — 10,000 overlapping
		// reads hit the window reliably, and it failed hard until this was fixed.
		// Catching it deterministically here would need a seam to hold a
		// transaction open on demand.
		const inflight = docIds.map(async (id, i) => {
			await new Promise((resolve) => setTimeout(resolve, i));
			return db.findByDocIdAdvanced(TEST_ORG_ID, id);
		});
		const reads = await Promise.all(inflight);

		expect(reads).toHaveLength(docIds.length);
		for (const doc of reads) {
			expect(doc).not.toBeNull();
			expect(doc?.organizationId).toBe(TEST_ORG_ID);
		}
	});

	it('overlapping reads and writes both succeed', async () => {
		// Staggered for the same reason as above.
		const work = [
			...docIds.map(async (id, i) => {
				await new Promise((resolve) => setTimeout(resolve, i));
				return db.findByDocIdAdvanced(TEST_ORG_ID, id);
			}),
			...docIds.map(async (id, i) => {
				await new Promise((resolve) => setTimeout(resolve, i));
				return db.updateDocDraft(TEST_ORG_ID, id, { title: `Rewritten ${i}` });
			})
		];

		const results = await Promise.all(work);
		expect(results.every((r) => r !== null)).toBe(true);

		// Every write landed — a leaked caller's write could commit on another
		// transaction's boundary, or be rolled back with it.
		for (const [i, id] of docIds.entries()) {
			const doc = await db.findByDocIdAdvanced(TEST_ORG_ID, id);
			expect(doc?.draftData.title).toBe(`Rewritten ${i}`);
		}
	});

	it('compare-and-swap still rejects a stale writer under concurrent load', async () => {
		const doc = await makeDoc('CAS under load');

		// One writer holds the correct revision; the rest are stale. Exactly one
		// may win, and the losers must fail as RevisionConflictError — not as the
		// uuid-cast error a lost org context produces, which the route layer would
		// report as a 500 instead of a 409.
		const attempts = await Promise.allSettled([
			db.updateDocDraft(TEST_ORG_ID, doc.id, { title: 'winner' }, 'user-1', doc.revision),
			db.updateDocDraft(TEST_ORG_ID, doc.id, { title: 'stale-1' }, 'user-1', doc.revision),
			db.updateDocDraft(TEST_ORG_ID, doc.id, { title: 'stale-2' }, 'user-1', doc.revision)
		]);

		const fulfilled = attempts.filter((a) => a.status === 'fulfilled');
		expect(fulfilled).toHaveLength(1);

		for (const attempt of attempts) {
			if (attempt.status === 'rejected') {
				expect(attempt.reason).toBeInstanceOf(RevisionConflictError);
			}
		}
	});
});
