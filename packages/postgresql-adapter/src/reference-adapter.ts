import { and, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { cmsSchema } from './schema';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DB = NodePgDatabase<typeof cmsSchema>;
type Tables = typeof cmsSchema;

export class PostgreSQLReferenceAdapter {
	constructor(
		private db: DB,
		private tables: Tables
	) {}

	/**
	 * Replace the back-reference rows for a given referencer atomically.
	 * DELETEs all existing rows pointing FROM the referencer, then INSERTs
	 * the new set. Called from the references-service after every save.
	 */
	async replaceReferencesFor(
		organizationId: string,
		referencerId: string,
		refIds: string[]
	): Promise<void> {
		await this.db.transaction(async (tx) => {
			await tx
				.delete(this.tables.documentReferences)
				.where(eq(this.tables.documentReferences.referencerId, referencerId));

			if (refIds.length === 0) return;

			// Dedupe — the unique constraint would reject duplicates anyway,
			// but it's cheaper to filter client-side than catch the error.
			const unique = Array.from(new Set(refIds.filter((id) => id && id !== referencerId)));
			if (unique.length === 0) return;

			// Drop references to documents that don't exist.
			//
			// `ref_id` is a foreign key and this is one batch insert, so a single
			// dangling id fails the whole statement — and since this index is now
			// written inside the document's write transaction and throws, that would
			// fail the *save*. A reference pointing at a deleted document is an
			// ordinary state, not a reason to refuse an editor's work; the resolver
			// already renders one as nothing.
			//
			// Same reasoning and same shape as `replaceAssetReferences`.
			// uuid columns again: a malformed `_ref` would throw on the cast rather
			// than simply not matching. See `uuidsOnly` in document-adapter.ts.
			const candidates = unique.filter((id) => UUID_PATTERN.test(id));
			if (candidates.length === 0) return;
			const present = await tx
				.select({ id: this.tables.documents.id })
				.from(this.tables.documents)
				.where(inArray(this.tables.documents.id, candidates));
			const live = present.map((row) => row.id);
			if (live.length === 0) return;

			await tx.insert(this.tables.documentReferences).values(
				live.map((refId) => ({
					referencerId,
					refId,
					organizationId
				}))
			);
		});
	}

	/**
	 * Find all documents that reference the given target. Joins through the
	 * documents table so callers get type/status without a second round-trip.
	 * Used by the unpublish guard to surface "X published documents reference
	 * this" before the user proceeds.
	 */
	async findBackReferences(
		organizationId: string,
		refId: string
	): Promise<Array<{ id: string; type: string; status: string | null }>> {
		const rows = await this.db
			.select({
				id: this.tables.documents.id,
				type: this.tables.documents.type,
				status: this.tables.documents.status
			})
			.from(this.tables.documentReferences)
			.innerJoin(
				this.tables.documents,
				eq(this.tables.documents.id, this.tables.documentReferences.referencerId)
			)
			.where(
				and(
					eq(this.tables.documentReferences.refId, refId),
					eq(this.tables.documentReferences.organizationId, organizationId)
				)
			);

		return rows;
	}

	/**
	 * Bulk fetch back-references for a set of refIds — used by future UX
	 * surfaces that highlight inbound dependencies for many docs at once.
	 */
	async findBackReferencesForMany(
		organizationId: string,
		refIds: string[]
	): Promise<Array<{ id: string; type: string; status: string | null; refId: string }>> {
		if (refIds.length === 0) return [];
		return await this.db
			.select({
				id: this.tables.documents.id,
				type: this.tables.documents.type,
				status: this.tables.documents.status,
				refId: this.tables.documentReferences.refId
			})
			.from(this.tables.documentReferences)
			.innerJoin(
				this.tables.documents,
				eq(this.tables.documents.id, this.tables.documentReferences.referencerId)
			)
			.where(
				and(
					inArray(this.tables.documentReferences.refId, refIds),
					eq(this.tables.documentReferences.organizationId, organizationId)
				)
			);
	}

	/**
	 * Whether the references table has any rows for this organization.
	 * Used by the cms-core boot path to decide whether a one-time backfill
	 * scan is needed.
	 */
	async hasAnyReferences(organizationId: string): Promise<boolean> {
		const [row] = await this.db
			.select({ id: this.tables.documentReferences.referencerId })
			.from(this.tables.documentReferences)
			.where(eq(this.tables.documentReferences.organizationId, organizationId))
			.limit(1);
		return !!row;
	}

	/**
	 * Bulk insert variant for the backfill path — one INSERT for all rows
	 * across the org instead of N transactions. The backfill knows the
	 * table is empty for this org, so we skip the per-referencer DELETE
	 * that `replaceReferencesFor` does. Falls back to a no-op if the input
	 * is empty.
	 */
	async bulkInsertReferences(
		rows: Array<{ organizationId: string; referencerId: string; refId: string }>
	): Promise<void> {
		if (rows.length === 0) return;
		// Dedupe — composite PK would reject duplicates, but the query is
		// cheaper if we filter first. Self-references are also dropped.
		const seen = new Set<string>();
		const filtered = rows.filter((r) => {
			if (!r.refId || r.refId === r.referencerId) return false;
			const key = `${r.referencerId}|${r.refId}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
		if (filtered.length === 0) return;
		await this.db.insert(this.tables.documentReferences).values(filtered).onConflictDoNothing();
	}
}
