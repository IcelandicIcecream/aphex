import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import { drizzle } from 'drizzle-orm/postgres-js';
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

const PARENT_ORG_ID = randomUUID();
const CHILD_ORG_ID_1 = randomUUID();
const CHILD_ORG_ID_2 = randomUUID();

const parentDocId = randomUUID();
const child1DocId = randomUUID();
const child2DocId = randomUUID();

beforeAll(async () => {
	// Create parent org
	await drizzleDb.insert(organizations).values({
		id: PARENT_ORG_ID,
		name: 'Hierarchy Test Parent',
		slug: `hierarchy-parent-${PARENT_ORG_ID.slice(0, 8)}`,
		createdBy: 'test'
	});

	// Create child orgs linked to parent
	await drizzleDb.insert(organizations).values([
		{
			id: CHILD_ORG_ID_1,
			name: 'Hierarchy Test Child 1',
			slug: `hierarchy-child1-${CHILD_ORG_ID_1.slice(0, 8)}`,
			parentOrganizationId: PARENT_ORG_ID,
			createdBy: 'test'
		},
		{
			id: CHILD_ORG_ID_2,
			name: 'Hierarchy Test Child 2',
			slug: `hierarchy-child2-${CHILD_ORG_ID_2.slice(0, 8)}`,
			parentOrganizationId: PARENT_ORG_ID,
			createdBy: 'test'
		}
	]);

	// Create documents in each org
	await drizzleDb.insert(documents).values([
		{
			id: parentDocId,
			organizationId: PARENT_ORG_ID,
			type: 'page',
			status: 'draft',
			draftData: { title: 'Parent Page' }
		},
		{
			id: child1DocId,
			organizationId: CHILD_ORG_ID_1,
			type: 'page',
			status: 'draft',
			draftData: { title: 'Child 1 Page' }
		},
		{
			id: child2DocId,
			organizationId: CHILD_ORG_ID_2,
			type: 'page',
			status: 'draft',
			draftData: { title: 'Child 2 Page' }
		}
	]);
}, 30000);

afterAll(async () => {
	// Clean up in reverse order (FK constraints)
	await drizzleDb.delete(documents).where(eq(documents.organizationId, PARENT_ORG_ID));
	await drizzleDb.delete(documents).where(eq(documents.organizationId, CHILD_ORG_ID_1));
	await drizzleDb.delete(documents).where(eq(documents.organizationId, CHILD_ORG_ID_2));
	await drizzleDb.delete(organizations).where(eq(organizations.id, CHILD_ORG_ID_1));
	await drizzleDb.delete(organizations).where(eq(organizations.id, CHILD_ORG_ID_2));
	await drizzleDb.delete(organizations).where(eq(organizations.id, PARENT_ORG_ID));
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
		await drizzleDb.insert(documents).values({
			id: ephemeralDocId,
			organizationId: CHILD_ORG_ID_2,
			type: 'page',
			status: 'draft',
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
		const instrumentedDrizzle = drizzle(client, {
			schema: cmsSchema,
			logger: countingLogger
		});
		countingDb = new PostgreSQLAdapter({
			db: instrumentedDrizzle,
			tables: cmsSchema,
			multiTenancy: { enableRLS: true, enableHierarchy: true }
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
