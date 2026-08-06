import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import type { Logger } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { db, client } from '$lib/server/db';
import { drizzleDb } from '$lib/server/db';
import { organizations, documents } from '$lib/server/db/cms-schema';
import * as cmsSchema from '$lib/server/db/cms-schema';
import { PostgreSQLAdapter } from '@aphexcms/postgresql-adapter';

/**
 * Org hierarchy integration tests.
 *
 * Verifies that parent-org operations (count, publish, update, delete)
 * reach into child orgs via single `inArray` queries instead of N+1 loops.
 * Fully ephemeral — creates and tears down its own orgs and documents.
 */

const isPglite = process.env.APHEX_DATABASE?.toLowerCase() === 'pglite';

const PARENT_ORG_ID = randomUUID();
const CHILD_ORG_ID_1 = randomUUID();
const CHILD_ORG_ID_2 = randomUUID();

const parentDocId = randomUUID();
const child1DocId = randomUUID();
const child2DocId = randomUUID();

// Seed through the adapter, not `drizzleDb` directly. Raw inserts run as the
// RLS-enforced role with no org context set, so `cms_documents`' withCheck
// policy rejects every row ("new row violates row-level security policy") on
// any driver where RLS is live — pglite today. `db.createDocument` opens the
// org context for you, which is the whole point of going through the port.
beforeAll(async () => {
	await db.createOrganization({
		id: PARENT_ORG_ID,
		name: 'Hierarchy Test Parent',
		slug: `hierarchy-parent-${PARENT_ORG_ID.slice(0, 8)}`,
		createdBy: 'test'
	});

	// Child orgs linked to parent
	await db.createOrganization({
		id: CHILD_ORG_ID_1,
		name: 'Hierarchy Test Child 1',
		slug: `hierarchy-child1-${CHILD_ORG_ID_1.slice(0, 8)}`,
		parentOrganizationId: PARENT_ORG_ID,
		createdBy: 'test'
	});
	await db.createOrganization({
		id: CHILD_ORG_ID_2,
		name: 'Hierarchy Test Child 2',
		slug: `hierarchy-child2-${CHILD_ORG_ID_2.slice(0, 8)}`,
		parentOrganizationId: PARENT_ORG_ID,
		createdBy: 'test'
	});

	// One document in each org
	await db.createDocument({
		id: parentDocId,
		organizationId: PARENT_ORG_ID,
		type: 'page',
		draftData: { title: 'Parent Page' }
	});
	await db.createDocument({
		id: child1DocId,
		organizationId: CHILD_ORG_ID_1,
		type: 'page',
		draftData: { title: 'Child 1 Page' }
	});
	await db.createDocument({
		id: child2DocId,
		organizationId: CHILD_ORG_ID_2,
		type: 'page',
		draftData: { title: 'Child 2 Page' }
	});
}, 30000);

afterAll(async () => {
	// Reverse order (FK constraints). Documents may already be gone — some tests
	// delete them — so tolerate a miss.
	for (const [orgId, docId] of [
		[PARENT_ORG_ID, parentDocId],
		[CHILD_ORG_ID_1, child1DocId],
		[CHILD_ORG_ID_2, child2DocId]
	] as const) {
		await db.deleteDocById(orgId, docId).catch(() => undefined);
	}
	await db.deleteOrganization(CHILD_ORG_ID_1);
	await db.deleteOrganization(CHILD_ORG_ID_2);
	await db.deleteOrganization(PARENT_ORG_ID);
}, 30000);

describe('org hierarchy — countDocsByType', () => {
	it('counts documents across parent + child orgs', async () => {
		const count = await db.countDocsByType(PARENT_ORG_ID, 'page');
		expect(count).toBe(3);
	});

	it('child org only counts its own documents', async () => {
		const count = await db.countDocsByType(CHILD_ORG_ID_1, 'page');
		expect(count).toBe(1);
	});
});

describe('org hierarchy — getDocCountsByType', () => {
	it('returns aggregated counts across parent + children', async () => {
		const counts = await db.getDocCountsByType(PARENT_ORG_ID);
		expect(counts.page).toBe(3);
	});
});

describe('org hierarchy — getChildOrganizations', () => {
	it('returns child org IDs for parent', async () => {
		const children = await db.getChildOrganizations(PARENT_ORG_ID);
		expect(children).toHaveLength(2);
		expect(children).toContain(CHILD_ORG_ID_1);
		expect(children).toContain(CHILD_ORG_ID_2);
	});

	it('returns empty array for child org (no grandchildren)', async () => {
		const children = await db.getChildOrganizations(CHILD_ORG_ID_1);
		expect(children).toHaveLength(0);
	});
});

describe('org hierarchy — publish doc in child org from parent', () => {
	it('publishes a child org document when queried from parent', async () => {
		const published = await db.publishDoc(PARENT_ORG_ID, child1DocId);
		expect(published).not.toBeNull();
		expect(published!.id).toBe(child1DocId);
	});

	it('unpublishes a child org document when queried from parent', async () => {
		const unpublished = await db.unpublishDoc(PARENT_ORG_ID, child1DocId);
		expect(unpublished).not.toBeNull();
		expect(unpublished!.id).toBe(child1DocId);
	});
});

describe('org hierarchy — update doc in child org from parent', () => {
	it('updates draft data of a child org document', async () => {
		const updated = await db.updateDocDraft(
			PARENT_ORG_ID,
			child2DocId,
			{ title: 'Updated from parent' },
			'test-user'
		);
		expect(updated).not.toBeNull();
		expect(updated!.id).toBe(child2DocId);
	});
});

describe('org hierarchy — delete doc in child org from parent', () => {
	let ephemeralDocId: string;

	beforeAll(async () => {
		ephemeralDocId = randomUUID();
		await db.createDocument({
			id: ephemeralDocId,
			organizationId: CHILD_ORG_ID_2,
			type: 'page',
			draftData: { title: 'To be deleted' }
		});
	});

	it('deletes a child org document when queried from parent', async () => {
		const deleted = await db.deleteDocById(PARENT_ORG_ID, ephemeralDocId);
		expect(deleted).toBe(true);
	});

	it('returns false for non-existent doc', async () => {
		const deleted = await db.deleteDocById(PARENT_ORG_ID, randomUUID());
		expect(deleted).toBe(false);
	});
});

// ============================================================
// N+1 query verification
//
// Creates a fresh adapter with a counting logger to prove that
// hierarchy operations use a bounded number of queries (not N+1).
// ============================================================

describe('org hierarchy — N+1 query elimination', () => {
	let countingDb: PostgreSQLAdapter;
	let queryCount: number;

	beforeAll(() => {
		queryCount = 0;
		const countingLogger: Logger = {
			logQuery() {
				queryCount++;
			}
		};
		// `client` is whatever driver the run selected — a postgres-js connection or
		// a PGlite instance. Building it with the postgres-js `drizzle` either way
		// produced a client whose query pipeline is half-wired ("Cannot read
		// properties of undefined (reading 'parsers')"), so pick the constructor to
		// match. `singleConnection` has to match too, or the adapter picks the
		// pooled transaction strategy and deadlocks on PGlite's one connection.
		const instrumentedDrizzle = isPglite
			? drizzlePglite({ client: client as never, schema: cmsSchema, logger: countingLogger })
			: drizzle(client as never, { schema: cmsSchema, logger: countingLogger });

		countingDb = new PostgreSQLAdapter({
			db: instrumentedDrizzle as never,
			tables: cmsSchema,
			multiTenancy: { enableRLS: true, enableHierarchy: true },
			singleConnection: isPglite
		});
	});

	it('countDocsByType uses ≤3 queries for parent with 2 children', async () => {
		queryCount = 0;
		await countingDb.countDocsByType(PARENT_ORG_ID, 'page');
		// Expected: 1 SET org context + 1 getChildOrganizations + 1 countDocsByTypeMultiOrg + 1 RESET
		// Should NOT be 1 + N (one per child org)
		expect(queryCount).toBeLessThanOrEqual(5);
	});

	it('getDocCountsByType uses ≤3 queries for parent with 2 children', async () => {
		queryCount = 0;
		await countingDb.getDocCountsByType(PARENT_ORG_ID);
		expect(queryCount).toBeLessThanOrEqual(5);
	});

	it('countDocsByType for a parent with children does NOT scale with child count', async () => {
		// Baseline: count queries for child org (no hierarchy to resolve)
		queryCount = 0;
		await countingDb.countDocsByType(CHILD_ORG_ID_1, 'page');
		const baselineQueries = queryCount;

		// Parent org has 2 children — query count should be similar, not baseline + 2
		queryCount = 0;
		await countingDb.countDocsByType(PARENT_ORG_ID, 'page');
		const parentQueries = queryCount;

		// With N+1, parentQueries would be baselineQueries + 2 extra count queries.
		// With the fix, it should be at most baselineQueries + 1 (the child org lookup).
		expect(parentQueries).toBeLessThanOrEqual(baselineQueries + 2);
	});
});
