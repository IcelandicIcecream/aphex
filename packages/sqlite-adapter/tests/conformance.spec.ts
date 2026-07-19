// Cross-dialect conformance suite: ONE spec run against BOTH database adapters —
// the PostgreSQL adapter on an in-memory pglite (real Postgres semantics, no Docker)
// and this SQLite adapter on an in-memory libsql. If the two data models drift
// (a column, a default, JSON filter/sort semantics), the same assertion fails on
// one dialect and not the other.
//
// Both adapters run in their WHERE-clause-isolation mode (the pg adapter with
// enableRLS: false — matching pooled-Postgres semantics, where the owner
// connection bypasses RLS anyway), so this exercises exactly the code paths
// production traffic uses.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { DatabaseAdapter } from '@aphexcms/cms-core/server';
import { ALL_CAPABILITIES } from '@aphexcms/cms-core';

// The adapters expose extra non-interface helpers (findAssetByIdGlobal, etc.)
type AnyAdapter = DatabaseAdapter & Record<string, any>;

interface Impl {
	name: string;
	setup(): Promise<{ adapter: AnyAdapter; teardown: () => Promise<void> | void }>;
}

const impls: Impl[] = [
	{
		name: 'postgresql-adapter (pglite in-memory)',
		async setup() {
			const { PGlite } = await import('@electric-sql/pglite');
			const { drizzle } = await import('drizzle-orm/pglite');
			const { pushSchema } = await import('drizzle-kit/api');
			const { PostgreSQLAdapter, cmsSchema } = await import('@aphexcms/postgresql-adapter');
			const client = new PGlite();
			const db = drizzle(client, { schema: cmsSchema });
			// push the drizzle schema straight into the fresh instance (no migration files needed)
			const { apply } = await pushSchema(cmsSchema, db as any);
			await apply();
			const adapter = new PostgreSQLAdapter({
				// drizzle/pglite and drizzle/postgres-js expose the same query surface — same
				// driver-boundary cast the pglite provider itself makes.
				db: db as any,
				tables: cmsSchema,
				multiTenancy: { enableRLS: false, enableHierarchy: true }
			});
			return { adapter: adapter as AnyAdapter, teardown: () => client.close() };
		}
	},
	{
		name: 'sqlite-adapter (libsql in-memory)',
		async setup() {
			const { createClient } = await import('@libsql/client');
			const { drizzle } = await import('drizzle-orm/libsql');
			const { pushSQLiteSchema } = await import('drizzle-kit/api');
			const { SQLiteAdapter, cmsSchema } = await import('../src/index.js');
			// cache=shared: libsql opens a second connection for transactions, and a plain
			// :memory: URL would give it a fresh empty database.
			const client = createClient({ url: 'file::memory:?cache=shared' });
			const db = drizzle(client, { schema: cmsSchema });
			const { apply } = await pushSQLiteSchema(cmsSchema, db as any);
			await apply();
			const adapter = new SQLiteAdapter({
				db,
				tables: cmsSchema,
				multiTenancy: { enableHierarchy: true }
			});
			return { adapter: adapter as AnyAdapter, teardown: () => client.close() };
		}
	}
];

describe.each(impls)('DatabaseAdapter conformance — $name', (impl) => {
	let adapter: AnyAdapter;
	let teardown: () => Promise<void> | void;
	let orgA: any;
	let orgB: any;

	beforeAll(async () => {
		({ adapter, teardown } = await impl.setup());
		orgA = await adapter.createOrganization({ name: 'Org A', slug: 'org-a', createdBy: 'user-1' });
		orgB = await adapter.createOrganization({ name: 'Org B', slug: 'org-b', createdBy: 'user-1' });
	});

	afterAll(async () => {
		await teardown();
	});

	it('creates organizations with generated ids and finds them by slug', async () => {
		expect(orgA.id).toMatch(/^[0-9a-f-]{36}$/i);
		expect(orgA.createdAt).toBeInstanceOf(Date);
		const found = await adapter.findOrganizationBySlug('org-a');
		expect(found?.id).toBe(orgA.id);
		const updated = await adapter.updateOrganization(orgA.id, { name: 'Org A2' });
		expect(updated?.name).toBe('Org A2');
	});

	it('seeds built-in roles idempotently (onConflictDoNothing)', async () => {
		await adapter.seedBuiltinRoles(orgA.id);
		await adapter.seedBuiltinRoles(orgA.id); // second call must be a no-op, not an error
		const roles = await adapter.listRoles(orgA.id);
		const names = roles.map((r: any) => r.name).sort();
		expect(names).toEqual(['admin', 'editor', 'owner', 'viewer']);
		const owner = roles.find((r: any) => r.name === 'owner');
		expect(owner.isBuiltIn).toBe(true);
		expect(Array.isArray(owner.capabilities)).toBe(true); // JSON array round-trip
		expect(owner.capabilities.length).toBeGreaterThan(0);
	});

	it('re-seeding reconciles owner to every capability but preserves edited roles', async () => {
		await adapter.seedBuiltinRoles(orgA.id);

		// Simulate an org seeded before a capability existed: owner's stored row is
		// missing one. Also narrow `editor` the way an operator legitimately might.
		await adapter.updateRole(orgA.id, 'owner', { capabilities: ['document.read'] });
		await adapter.updateRole(orgA.id, 'editor', { capabilities: ['document.read'] });

		await adapter.seedBuiltinRoles(orgA.id);

		const roles = await adapter.listRoles(orgA.id);
		const owner = roles.find((r: any) => r.name === 'owner');
		const editor = roles.find((r: any) => r.name === 'editor');

		// owner is an invariant — reconciled back to the full set.
		expect([...owner.capabilities].sort()).toEqual([...ALL_CAPABILITIES].sort());
		// editor is a floor — an operator's narrowing must survive re-seeding.
		expect(editor.capabilities).toEqual(['document.read']);
	});

	it('seeds owner with plugin-declared capabilities when given them', async () => {
		// What "every capability" means depends on the install: the engine passes
		// core's built-ins plus whatever the registered plugins declare. Without this
		// an owner could not hold a capability its own plugins declared — ending up
		// with strictly fewer permissions than admin.
		const withPlugin = [...ALL_CAPABILITIES, 'plato.sync.run'];
		await adapter.seedBuiltinRoles(orgB.id, withPlugin);

		let owner = (await adapter.listRoles(orgB.id)).find((r: any) => r.name === 'owner');
		expect(owner.capabilities).toContain('plato.sync.run');

		// Re-seeding after a plugin is removed drops its capability back off owner.
		await adapter.seedBuiltinRoles(orgB.id, [...ALL_CAPABILITIES]);
		owner = (await adapter.listRoles(orgB.id)).find((r: any) => r.name === 'owner');
		expect(owner.capabilities).not.toContain('plato.sync.run');
	});

	it('document lifecycle: create → update draft → publish → unpublish', async () => {
		const doc = await adapter.createDocument({
			organizationId: orgA.id,
			type: 'post',
			draftData: { title: 'Lifecycle', nested: { author: { name: 'Ben' } } },
			createdBy: 'user-1'
		});
		expect(doc.status).toBe('draft');
		expect(doc.createdAt).toBeInstanceOf(Date);

		const updated = await adapter.updateDocDraft(orgA.id, doc.id, {
			title: 'Lifecycle v2',
			nested: { author: { name: 'Ben' } }
		});
		expect(updated?.draftData.title).toBe('Lifecycle v2');

		const published = await adapter.publishDoc(orgA.id, doc.id);
		expect(published?.status).toBe('published');
		expect(published?.publishedData?.title).toBe('Lifecycle v2');
		expect(published?.publishedHash).toBeTruthy();
		expect(published?.publishedAt).toBeInstanceOf(Date);

		const unpublished = await adapter.unpublishDoc(orgA.id, doc.id);
		expect(unpublished?.status).toBe('unpublished');
		// soft unpublish keeps publishedData
		expect(unpublished?.publishedData?.title).toBe('Lifecycle v2');
	});

	it('isolates documents between organizations via WHERE filtering', async () => {
		const doc = await adapter.createDocument({
			organizationId: orgA.id,
			type: 'secret',
			draftData: { title: 'A only' },
			createdBy: 'user-1'
		});
		expect(await adapter.findByDocIdAdvanced(orgA.id, doc.id)).not.toBeNull();
		expect(await adapter.findByDocIdAdvanced(orgB.id, doc.id)).toBeNull();
		const listB = await adapter.findManyDocAdvanced(orgB.id, 'secret');
		expect(listB.totalDocs).toBe(0);
	});

	describe('JSON filters and sorting', () => {
		beforeAll(async () => {
			const rows = [
				{ title: 'Alpha Post', rating: 5, featured: true, tag: 'news' },
				{ title: 'beta post', rating: 2, featured: false, tag: 'life' },
				{ title: 'Gamma', rating: 8, featured: false }
			];
			for (const draftData of rows) {
				await adapter.createDocument({
					organizationId: orgA.id,
					type: 'article',
					draftData,
					createdBy: 'user-1'
				});
			}
		});

		it('contains is case-insensitive (ILIKE ↔ LIKE parity)', async () => {
			const r = await adapter.findManyDocAdvanced(orgA.id, 'article', {
				where: { title: { contains: 'POST' } }
			});
			expect(r.totalDocs).toBe(2);
		});

		it('numeric comparison on JSON fields', async () => {
			const r = await adapter.findManyDocAdvanced(orgA.id, 'article', {
				where: { rating: { greater_than: 4 } }
			});
			expect(r.docs.map((d: any) => d.draftData.title).sort()).toEqual(['Alpha Post', 'Gamma']);
		});

		it('boolean equals on JSON fields (true is 1 in SQLite, true in PG)', async () => {
			const r = await adapter.findManyDocAdvanced(orgA.id, 'article', {
				where: { featured: { equals: true } }
			});
			expect(r.totalDocs).toBe(1);
			expect(r.docs[0].draftData.title).toBe('Alpha Post');
		});

		it('in / not_in on JSON fields (= ANY ↔ IN parity)', async () => {
			const r = await adapter.findManyDocAdvanced(orgA.id, 'article', {
				where: { title: { in: ['Alpha Post', 'Gamma'] } }
			});
			expect(r.totalDocs).toBe(2);
			const n = await adapter.findManyDocAdvanced(orgA.id, 'article', {
				where: { title: { not_in: ['Alpha Post', 'Gamma'] } }
			});
			expect(n.docs.map((d: any) => d.draftData.title)).toEqual(['beta post']);
		});

		it('exists on JSON fields (missing key is NULL)', async () => {
			const withTag = await adapter.findManyDocAdvanced(orgA.id, 'article', {
				where: { tag: { exists: true } }
			});
			expect(withTag.totalDocs).toBe(2);
			const withoutTag = await adapter.findManyDocAdvanced(orgA.id, 'article', {
				where: { tag: { exists: false } }
			});
			expect(withoutTag.docs[0].draftData.title).toBe('Gamma');
		});

		it('sorts by JSON fields ascending and descending', async () => {
			const desc = await adapter.findManyDocAdvanced(orgA.id, 'article', { sort: '-rating' });
			expect(desc.docs.map((d: any) => d.draftData.rating)).toEqual([8, 5, 2]);
			const asc = await adapter.findManyDocAdvanced(orgA.id, 'article', { sort: 'title' });
			expect(asc.docs[0].draftData.title).toBe('Alpha Post');
		});

		it('paginates with stable metadata', async () => {
			const page = await adapter.findManyDocAdvanced(orgA.id, 'article', {
				limit: 2,
				offset: 0,
				sort: '-rating'
			});
			expect(page.totalDocs).toBe(3);
			expect(page.totalPages).toBe(2);
			expect(page.hasNextPage).toBe(true);
			expect(page.hasPrevPage).toBe(false);
			expect(page.docs).toHaveLength(2);
		});

		it('countDocuments honors where clauses', async () => {
			expect(
				await adapter.countDocuments(orgA.id, 'article', { rating: { less_than_equal: 5 } })
			).toBe(2);
		});
	});

	it('version history: incrementing numbers, list, get, delete', async () => {
		const doc = await adapter.createDocument({
			organizationId: orgA.id,
			type: 'versioned',
			draftData: { title: 'v0' },
			createdBy: 'user-1'
		});
		const v1 = await adapter.createDocumentVersion({
			documentId: doc.id,
			organizationId: orgA.id,
			eventType: 'draft',
			data: { title: 'v1' }
		});
		const v2 = await adapter.createDocumentVersion({
			documentId: doc.id,
			organizationId: orgA.id,
			eventType: 'publish',
			data: { title: 'v2' }
		});
		expect(v1?.versionNumber).toBe(1);
		expect(v2?.versionNumber).toBe(2);

		const list = await adapter.listDocumentVersions(orgA.id, doc.id);
		expect(list.total).toBe(2);
		expect(list.versions[0].versionNumber).toBe(2); // newest first

		const got = await adapter.getDocumentVersion(orgA.id, doc.id, 1);
		expect(got?.data.title).toBe('v1');

		await adapter.deleteDocumentVersions(doc.id, [v1!.id]);
		expect((await adapter.listDocumentVersions(orgA.id, doc.id)).total).toBe(1);
	});

	describe('events + jobs (durable spine)', () => {
		it('appends and reads back a domain event; isolates by org', async () => {
			const evt = await adapter.appendEvent({
				organizationId: orgA.id,
				type: 'test.happened',
				payload: { hello: 'world', n: 42 },
				createdBy: 'user-1'
			});
			expect(evt.id).toMatch(/^[0-9a-f-]{36}$/i);
			expect(evt.createdAt).toBeInstanceOf(Date);
			expect(evt.payload).toEqual({ hello: 'world', n: 42 });

			const got = await adapter.getEvent(orgA.id, evt.id);
			expect(got?.type).toBe('test.happened');
			// Org isolation: another org can't read it.
			expect(await adapter.getEvent(orgB.id, evt.id)).toBeNull();
		});

		it('withTransaction: an event commits atomically with a write, and rolls back together', async () => {
			// Commit path: doc + event in one tx are both visible after.
			const committed = await adapter.withTransaction(async (tx: AnyAdapter) => {
				const d = await tx.createDocument({
					organizationId: orgA.id,
					type: 'post',
					draftData: { title: 'tx' },
					createdBy: 'user-1'
				});
				const e = await tx.appendEvent({
					organizationId: orgA.id,
					type: 'outbox.test',
					payload: { documentId: d.id }
				});
				return { docId: d.id, eventId: e.id };
			});
			expect(await adapter.findByDocIdAdvanced(orgA.id, committed.docId)).toBeTruthy();
			expect(await adapter.getEvent(orgA.id, committed.eventId)).toBeTruthy();

			// Rollback path: a throw after appendEvent must undo the event too.
			let capturedEventId: string | undefined;
			await expect(
				adapter.withTransaction(async (tx: AnyAdapter) => {
					const e = await tx.appendEvent({
						organizationId: orgA.id,
						type: 'outbox.rollback',
						payload: {}
					});
					capturedEventId = e.id;
					throw new Error('boom');
				})
			).rejects.toThrow('boom');
			expect(capturedEventId).toBeDefined();
			expect(await adapter.getEvent(orgA.id, capturedEventId!)).toBeNull();
		});

		it('schedules, claims with a lease, and completes a job', async () => {
			const job = await adapter.scheduleJob({
				organizationId: orgA.id,
				type: 'document.publish',
				payload: { documentId: 'doc-1' },
				runAt: new Date(Date.now() - 1000) // already due
			});
			expect(job.status).toBe('pending');
			expect(job.attempts).toBe(0);

			const claimed = await adapter.claimDueJobs({
				organizationId: orgA.id,
				limit: 10,
				workerId: 'worker-1',
				leaseMs: 30_000
			});
			const mine = claimed.find((j: any) => j.id === job.id);
			expect(mine).toBeTruthy();
			expect(mine.status).toBe('leased');
			expect(mine.leaseOwner).toBe('worker-1');
			expect(mine.attempts).toBe(1);
			expect(mine.leaseExpiresAt).toBeInstanceOf(Date);

			await adapter.completeJob(orgA.id, job.id);
			// A completed job is no longer claimable.
			const again = await adapter.claimDueJobs({
				organizationId: orgA.id,
				limit: 10,
				workerId: 'worker-2',
				leaseMs: 30_000
			});
			expect(again.find((j: any) => j.id === job.id)).toBeFalsy();
		});

		it('does not claim jobs scheduled in the future', async () => {
			const future = await adapter.scheduleJob({
				organizationId: orgA.id,
				type: 'document.publish',
				payload: {},
				runAt: new Date(Date.now() + 60_000)
			});
			const claimed = await adapter.claimDueJobs({
				organizationId: orgA.id,
				limit: 10,
				workerId: 'worker-1',
				leaseMs: 30_000
			});
			expect(claimed.find((j: any) => j.id === future.id)).toBeFalsy();
		});

		it('scheduleJob is idempotent on idempotencyKey', async () => {
			const key = 'publish:doc-42';
			const a = await adapter.scheduleJob({
				organizationId: orgA.id,
				type: 'document.publish',
				payload: { documentId: 'doc-42' },
				idempotencyKey: key
			});
			const b = await adapter.scheduleJob({
				organizationId: orgA.id,
				type: 'document.publish',
				payload: { documentId: 'doc-42' },
				idempotencyKey: key
			});
			expect(b.id).toBe(a.id);
		});

		it('retryJob reschedules a claimed job and clears the lease', async () => {
			const job = await adapter.scheduleJob({
				organizationId: orgA.id,
				type: 'document.publish',
				payload: {},
				runAt: new Date(Date.now() - 1000)
			});
			await adapter.claimDueJobs({
				organizationId: orgA.id,
				limit: 10,
				workerId: 'worker-1',
				leaseMs: 30_000
			});

			// Reschedule far into the future — it must not be immediately reclaimable.
			await adapter.retryJob(orgA.id, job.id, {
				runAt: new Date(Date.now() + 60_000),
				error: 'boom'
			});
			const soon = await adapter.claimDueJobs({
				organizationId: orgA.id,
				limit: 10,
				workerId: 'worker-2',
				leaseMs: 30_000
			});
			expect(soon.find((j: any) => j.id === job.id)).toBeFalsy();

			// Rescheduled to the past → claimable again, lease reset, error recorded.
			await adapter.retryJob(orgA.id, job.id, {
				runAt: new Date(Date.now() - 1000),
				error: 'boom again'
			});
			const claimed = await adapter.claimDueJobs({
				organizationId: orgA.id,
				limit: 10,
				workerId: 'worker-3',
				leaseMs: 30_000
			});
			const mine = claimed.find((j: any) => j.id === job.id);
			expect(mine).toBeTruthy();
			expect(mine.status).toBe('leased');
			expect(mine.lastError).toBe('boom again');
			// attempts bumps only on a successful claim. claim(→1) → retry-to-future (keeps 1)
			// → claim skipped, not due (keeps 1) → retry-to-past (keeps 1) → claim(→2). retryJob
			// itself never touches attempts.
			expect(mine.attempts).toBe(2);
		});

		it('failJob dead-letters a job so it is never reclaimed', async () => {
			const job = await adapter.scheduleJob({
				organizationId: orgA.id,
				type: 'document.publish',
				payload: {},
				runAt: new Date(Date.now() - 1000)
			});
			await adapter.claimDueJobs({
				organizationId: orgA.id,
				limit: 10,
				workerId: 'worker-1',
				leaseMs: 30_000
			});
			await adapter.failJob(orgA.id, job.id, { error: 'permanent' });

			// A failed job is terminal — even after its lease would expire it's not claimable.
			const again = await adapter.claimDueJobs({
				organizationId: orgA.id,
				limit: 10,
				workerId: 'worker-2',
				leaseMs: 30_000,
				now: new Date(Date.now() + 120_000)
			});
			expect(again.find((j: any) => j.id === job.id)).toBeFalsy();
		});

		it('cancelJob makes a pending job terminal (never claimed)', async () => {
			const job = await adapter.scheduleJob({
				organizationId: orgA.id,
				type: 'document.publish',
				payload: {},
				runAt: new Date(Date.now() - 1000)
			});
			await adapter.cancelJob(orgA.id, job.id);
			const claimed = await adapter.claimDueJobs({
				organizationId: orgA.id,
				limit: 10,
				workerId: 'w',
				leaseMs: 30_000
			});
			expect(claimed.find((j: any) => j.id === job.id)).toBeFalsy();
		});

		it('listEvents returns org events newest-first, filterable by type, org-isolated', async () => {
			// Fresh org so exact counts aren't polluted by earlier tests in this block.
			const org = await adapter.createOrganization({
				name: 'Ev',
				slug: 'ev-list',
				createdBy: 'user-1'
			});
			await adapter.appendEvent({
				organizationId: org.id,
				type: 'document.published',
				payload: { n: 1 }
			});
			await adapter.appendEvent({
				organizationId: org.id,
				type: 'document.published',
				payload: { n: 2 }
			});
			await adapter.appendEvent({ organizationId: org.id, type: 'other.event', payload: {} });
			await adapter.appendEvent({
				organizationId: orgA.id,
				type: 'document.published',
				payload: {}
			});

			const all = await adapter.listEvents({ organizationId: org.id });
			expect(all.total).toBe(3); // orgA's event excluded
			expect(all.items).toHaveLength(3);
			// Newest first: the 'other.event' was appended last.
			expect(all.items[0].type).toBe('other.event');

			const filtered = await adapter.listEvents({
				organizationId: org.id,
				type: 'document.published'
			});
			expect(filtered.total).toBe(2);
			expect(filtered.items.every((e: any) => e.type === 'document.published')).toBe(true);

			const paged = await adapter.listEvents({ organizationId: org.id, limit: 1, offset: 0 });
			expect(paged.items).toHaveLength(1);
			expect(paged.total).toBe(3); // total is unfiltered by paging
		});

		it('listJobs returns org jobs newest-first, filterable by status', async () => {
			const org = await adapter.createOrganization({
				name: 'Jb',
				slug: 'jb-list',
				createdBy: 'user-1'
			});
			const j1 = await adapter.scheduleJob({
				organizationId: org.id,
				type: 'document.publish',
				payload: {}
			});
			// j2 is scheduled in the future so the claim below leaves it pending (claims only j1).
			await adapter.scheduleJob({
				organizationId: org.id,
				type: 'document.publish',
				payload: {},
				runAt: new Date(Date.now() + 60_000)
			});
			await adapter.scheduleJob({ organizationId: orgA.id, type: 'document.publish', payload: {} });
			// Move j1 to failed so a status filter has something to select.
			await adapter.claimDueJobs({
				organizationId: org.id,
				limit: 10,
				workerId: 'w',
				leaseMs: 1000
			});
			await adapter.failJob(org.id, j1.id, { error: 'x' });

			const all = await adapter.listJobs({ organizationId: org.id });
			expect(all.total).toBe(2); // orgA excluded

			const failed = await adapter.listJobs({ organizationId: org.id, status: 'failed' });
			expect(failed.total).toBe(1);
			expect(failed.items[0].id).toBe(j1.id);

			const multi = await adapter.listJobs({
				organizationId: org.id,
				status: ['pending', 'failed']
			});
			expect(multi.total).toBe(2);
		});
	});

	it('back-references: replace, find, bulk insert with dedupe', async () => {
		const a = await adapter.createDocument({
			organizationId: orgA.id,
			type: 'ref',
			draftData: { title: 'referencer' },
			createdBy: 'user-1'
		});
		const b = await adapter.createDocument({
			organizationId: orgA.id,
			type: 'ref',
			draftData: { title: 'target' },
			createdBy: 'user-1'
		});

		await adapter.replaceReferencesFor(orgA.id, a.id, [b.id, b.id, a.id]); // dupes + self-ref dropped
		const back = await adapter.findBackReferences(orgA.id, b.id);
		expect(back).toHaveLength(1);
		expect(back[0].id).toBe(a.id);
		expect(await adapter.hasAnyReferences(orgA.id)).toBe(true);

		await adapter.replaceReferencesFor(orgA.id, a.id, []);
		expect(await adapter.findBackReferences(orgA.id, b.id)).toHaveLength(0);

		await adapter.bulkInsertReferences([
			{ organizationId: orgA.id, referencerId: a.id, refId: b.id },
			{ organizationId: orgA.id, referencerId: a.id, refId: b.id }, // dupe
			{ organizationId: orgA.id, referencerId: a.id, refId: a.id } // self-ref
		]);
		expect(await adapter.findBackReferences(orgA.id, b.id)).toHaveLength(1);
	});

	it('asset scanning finds JSON data referencing an asset id', async () => {
		const assetId = crypto.randomUUID();
		await adapter.createDocument({
			organizationId: orgA.id,
			type: 'with-asset',
			draftData: { image: { _type: 'image', asset: { _ref: assetId } } },
			createdBy: 'user-1'
		});
		const refs = await adapter.findDocumentsReferencingAsset(orgA.id, assetId);
		expect(refs).toHaveLength(1);
		const counts = await adapter.countDocumentReferencesForAssets(orgA.id, [assetId]);
		expect(counts[assetId]).toBe(1);
	});

	it('assets: CRUD, search, counts, sizes, global lookup', async () => {
		const asset = await adapter.createAsset({
			organizationId: orgA.id,
			assetType: 'image',
			filename: 'x1.jpg',
			originalFilename: 'holiday-photo.jpg',
			mimeType: 'image/jpeg',
			size: 1000,
			url: '/assets/x1.jpg',
			path: 'assets/x1.jpg',
			storageAdapter: 'local',
			width: 800,
			height: 600,
			metadata: { palette: ['#fff'] },
			createdBy: 'user-1'
		});
		expect(asset.id).toBeTruthy();
		expect(asset.createdAt).toBeInstanceOf(Date);

		const found = await adapter.findAssets(orgA.id, { search: 'holiday' });
		expect(found).toHaveLength(1);
		expect(found[0].metadata.palette).toEqual(['#fff']); // JSON round-trip

		expect(await adapter.countAssets(orgA.id)).toBe(1);
		expect((await adapter.countAssetsByType(orgA.id)).image).toBe(1);
		expect(await adapter.getTotalAssetsSize(orgA.id)).toBe(1000);

		// global lookup: no org scoping (public asset serving)
		const global = await adapter.findAssetByIdGlobal(asset.id);
		expect(global?.organizationId).toBe(orgA.id);

		const updated = await adapter.updateAsset(orgA.id, asset.id, { title: 'Holiday' });
		expect(updated?.title).toBe('Holiday');
		expect(await adapter.deleteAsset(orgA.id, asset.id)).toBe(true);
	});

	it('user profiles: create, preferences merge, first-user detection', async () => {
		expect(await adapter.hasAnyUserProfiles()).toBe(false);
		await adapter.createUserProfile({ userId: 'user-1', role: 'super_admin' });
		expect(await adapter.hasAnyUserProfiles()).toBe(true);

		await adapter.updateUserPreferences('user-1', { includeChildOrganizations: true });
		await adapter.updateUserPreferences('user-1', { theme: 'dark' } as any);
		const profile = await adapter.findUserProfileById('user-1');
		// merges, doesn't overwrite
		expect(profile?.preferences).toMatchObject({ includeChildOrganizations: true, theme: 'dark' });
	});

	it('memberships and user sessions (upsert)', async () => {
		await adapter.addMember({ organizationId: orgA.id, userId: 'user-1', role: 'owner' });
		const membership = await adapter.findUserMembership('user-1', orgA.id);
		expect(membership?.role).toBe('owner');
		const orgs = await adapter.findUserOrganizations('user-1');
		expect(orgs).toHaveLength(1);
		expect(orgs[0].organization.id).toBe(orgA.id);
		expect(orgs[0].member.userId).toBe('user-1');

		// second call exercises onConflictDoUpdate
		await adapter.updateUserSession('user-1', orgA.id);
		await adapter.updateUserSession('user-1', orgB.id);
		const session = await adapter.findUserSession('user-1');
		expect(session?.activeOrganizationId).toBe(orgB.id);
	});

	it('invitations: accept flow and expired cleanup (NOW() ↔ Date parity)', async () => {
		const future = new Date(Date.now() + 86_400_000);
		const past = new Date(Date.now() - 86_400_000);
		await adapter.createInvitation({
			organizationId: orgA.id,
			email: 'new@example.com',
			role: 'editor',
			token: 'tok-valid',
			invitedBy: 'user-1',
			expiresAt: future
		});
		await adapter.createInvitation({
			organizationId: orgA.id,
			email: 'late@example.com',
			role: 'editor',
			token: 'tok-expired',
			invitedBy: 'user-1',
			expiresAt: past
		});

		expect(await adapter.cleanupExpiredInvitations()).toBe(1);
		expect(await adapter.findInvitationByToken('tok-expired')).toBeNull();

		const member = await adapter.acceptInvitation('tok-valid', 'user-2');
		expect(member.organizationId).toBe(orgA.id);
		expect(member.role).toBe('editor');
		const accepted = await adapter.findInvitationByToken('tok-valid');
		expect(accepted?.acceptedAt).toBeInstanceOf(Date);
	});

	it('instance settings: defaults and merge on update', async () => {
		expect(await adapter.getInstanceSettings()).toEqual({ allowUserOrgCreation: false });
		await adapter.updateInstanceSettings({ allowUserOrgCreation: true });
		const merged = await adapter.updateInstanceSettings({ banner: 'hi' });
		expect(merged).toMatchObject({ allowUserOrgCreation: true, banner: 'hi' });
	});

	it('hierarchy: child organizations resolve', async () => {
		const child = await adapter.createOrganization({
			name: 'Child of A',
			slug: 'child-a',
			parentOrganizationId: orgA.id,
			createdBy: 'user-1'
		});
		expect(await adapter.getChildOrganizations(orgA.id)).toEqual([child.id]);
	});

	it('cascades deletes through foreign keys (org → documents)', async () => {
		// SQLite only honors ON DELETE CASCADE when PRAGMA foreign_keys is on —
		// this catches a silently-disabled-FK configuration.
		const org = await adapter.createOrganization({
			name: 'Doomed',
			slug: 'doomed',
			createdBy: 'user-1'
		});
		const doc = await adapter.createDocument({
			organizationId: org.id,
			type: 'post',
			draftData: { title: 'goes down with the ship' },
			createdBy: 'user-1'
		});
		await adapter.deleteOrganization(org.id);
		expect(await adapter.findByDocIdAdvanced(org.id, doc.id)).toBeNull();
		expect(await adapter.countDocuments(org.id, 'post')).toBe(0);
	});

	it('reports healthy', async () => {
		expect(await adapter.isHealthy()).toBe(true);
	});
});

// Structural parity: same tables, same columns, same nullability across dialects —
// catches schema drift before behavior does.
describe('schema structural parity (pg ↔ sqlite)', () => {
	it('exposes identical table/column shapes', async () => {
		const { getTableConfig: pgConfig } = await import('drizzle-orm/pg-core');
		const { getTableConfig: sqliteConfig } = await import('drizzle-orm/sqlite-core');
		const { cmsSchema: pg } = await import('@aphexcms/postgresql-adapter/schema');
		const { cmsSchema: sqlite } = await import('../src/schema.js');

		const shape = (
			config: (t: any) => { name: string; columns: Array<{ name: string; notNull: boolean }> },
			tables: Record<string, any>
		) =>
			Object.values(tables)
				// pg cmsSchema also bundles pgEnum objects — only diff the actual tables
				.filter((t) => {
					try {
						return !!config(t).columns;
					} catch {
						return false;
					}
				})
				.map((t) => {
					const c = config(t);
					return {
						table: c.name,
						columns: c.columns.map((col) => `${col.name}${col.notNull ? '!' : ''}`).sort()
					};
				})
				.sort((a, b) => a.table.localeCompare(b.table));

		expect(shape(sqliteConfig, sqlite)).toEqual(shape(pgConfig, pg));
	});
});
