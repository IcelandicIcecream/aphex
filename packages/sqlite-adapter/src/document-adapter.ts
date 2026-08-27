// SQLite document adapter implementation
import { drizzle } from 'drizzle-orm/libsql';
import { eq, and, or as drizzleOr, desc, sql, inArray } from 'drizzle-orm';
import type {
	DocumentAdapter,
	CreateDocumentData,
	Document,
	DocumentVersion,
	DocumentVersionList,
	FindOptions,
	FindResult,
	Where
} from '@aphexcms/cms-core/server';
import { createHashForPublishing, RevisionConflictError } from '@aphexcms/cms-core/server';
import type { CMSSchema } from './schema';
import { resolveReferences } from './utils/reference-resolver';
import { parseWhere, parseSort } from './filter-parser';

// Default values
const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;

/**
 * Turn freeform user search input into a safe, prefix-matching FTS5 `MATCH`
 * query: each token individually double-quoted (embedded quotes doubled) and
 * suffixed with `*` for a prefix match, joined with FTS5's default implicit
 * AND. Quoting prevents FTS5's own query-syntax special characters (`*`, `:`,
 * a leading `-`, unbalanced quotes, …) from throwing a syntax error on
 * arbitrary input — the same job `to_tsquery` + manual `:*` suffixing does on
 * the Postgres side. Prefix matching is the only mode — a search box is
 * expected to match "gard" against "garden" as the user types.
 */
function toFts5Query(input: string): string {
	return input
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map((token) => `"${token.replace(/"/g, '""')}"*`)
		.join(' ');
}

/**
 * Recursively walk a JSON value and remove any objects referencing the given
 * asset ID. For arrays, matching items are filtered out entirely. For object
 * fields, matching values become null (the key stays but the value is cleared).
 */
function stripAssetId(data: unknown, assetId: string): unknown {
	if (data === null || data === undefined) return data;
	if (Array.isArray(data)) {
		return data.map((item) => stripAssetId(item, assetId)).filter((item) => item !== null);
	}
	if (typeof data === 'object') {
		const obj = data as Record<string, unknown>;
		if (obj._ref === assetId) return null;
		const out: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(obj)) {
			const stripped = stripAssetId(value, assetId);
			if (stripped === null && typeof value === 'object' && value !== null) {
				const v = value as Record<string, unknown>;
				if (v._type === 'image' || v._type === 'file' || v._ref === assetId) {
					continue;
				}
			}
			out[key] = stripped;
		}
		return out;
	}
	return data;
}

// Document status constants
export const DOCUMENT_STATUS = {
	DRAFT: 'draft' as const,
	PUBLISHED: 'published' as const,
	UNPUBLISHED: 'unpublished' as const
};

export type DocumentStatus = 'draft' | 'published' | 'unpublished';

/**
 * SQLite document adapter implementation
 * Handles all document-related database operations
 */
export class SQLiteDocumentAdapter implements DocumentAdapter {
	private db: ReturnType<typeof drizzle>;
	private tables: CMSSchema;
	/**
	 * This adapter has no committed migration baseline yet (unlike Postgres,
	 * which gets the GIN index via a generated migration) — so the FTS5 shadow
	 * table is self-provisioned here, mirroring the RLS-role setup pattern in
	 * `postgresql-adapter/src/pglite.ts`. `IF NOT EXISTS`-guarded, safe to run
	 * on every construction. Standalone table (no `content=` linkage) synced
	 * entirely by application code — avoids SQLite rowid/UUID-PK mapping issues.
	 */
	private searchIndexReady: Promise<void>;

	constructor(db: ReturnType<typeof drizzle>, tables: CMSSchema) {
		this.db = db;
		this.tables = tables;
		this.searchIndexReady = this.ensureSearchIndex();
	}

	private async ensureSearchIndex(): Promise<void> {
		try {
			await this.db.run(
				sql`CREATE VIRTUAL TABLE IF NOT EXISTS cms_documents_fts USING fts5(doc_id UNINDEXED, search_text)`
			);
		} catch (err) {
			console.error(
				'[sqlite-adapter] failed to create the full-text search index — search will return no results:',
				err
			);
		}
	}

	/**
	 * Create new document (always starts as draft)
	 */
	async createDocument(data: CreateDocumentData): Promise<Document> {
		const now = new Date();

		const result = await this.db
			.insert(this.tables.documents)
			.values({
				...(data.id ? { id: data.id } : {}),
				organizationId: data.organizationId,
				type: data.type,
				status: DOCUMENT_STATUS.DRAFT,
				draftData: data.draftData,
				createdBy: data.createdBy,
				createdAt: now,
				updatedAt: now
			})
			.returning();

		return result[0]! as Document;
	}

	/**
	 * Update draft data (auto-save)
	 */
	async updateDocDraft(
		organizationId: string,
		id: string,
		data: any,
		updatedBy?: string,
		expectedRevision?: number
	): Promise<Document | null> {
		const now = new Date();

		const conditions = [
			eq(this.tables.documents.id, id),
			eq(this.tables.documents.organizationId, organizationId)
		];
		if (expectedRevision !== undefined) {
			conditions.push(eq(this.tables.documents.revision, expectedRevision));
		}

		const result = await this.db
			.update(this.tables.documents)
			.set({
				draftData: data,
				updatedBy,
				updatedAt: now,
				revision: sql`${this.tables.documents.revision} + 1`
			})
			.where(and(...conditions))
			.returning();

		if (result[0]) return result[0] as Document;

		if (expectedRevision !== undefined) {
			const current = await this.findByDocIdAdvanced(organizationId, id);
			if (current) {
				throw new RevisionConflictError(
					`Document ${id} was modified by another writer (expected revision ${expectedRevision}, current is ${current.revision})`,
					id,
					expectedRevision,
					current.revision
				);
			}
		}

		return null;
	}

	/**
	 * Publish document (copy draft -> published)
	 */
	async publishDoc(
		organizationId: string,
		id: string,
		expectedRevision?: number
	): Promise<Document | null> {
		const now = new Date();

		// Get current document
		const current = await this.findByDocIdAdvanced(organizationId, id);
		if (!current || !current.draftData) {
			return null;
		}

		// Create content hash for change detection
		const contentHash = createHashForPublishing(current.draftData);

		const conditions = [
			eq(this.tables.documents.id, id),
			eq(this.tables.documents.organizationId, organizationId)
		];
		if (expectedRevision !== undefined) {
			conditions.push(eq(this.tables.documents.revision, expectedRevision));
		}

		const result = await this.db
			.update(this.tables.documents)
			.set({
				status: DOCUMENT_STATUS.PUBLISHED,
				publishedData: current.draftData,
				publishedHash: contentHash,
				publishedAt: now,
				updatedAt: now
			})
			.where(and(...conditions))
			.returning();

		if (result[0]) return result[0] as Document;

		if (expectedRevision !== undefined) {
			throw new RevisionConflictError(
				`Document ${id} was modified since it was last read (expected revision ${expectedRevision}, current is ${current.revision})`,
				id,
				expectedRevision,
				current.revision
			);
		}

		return null;
	}

	/**
	 * Unpublish document (soft — keeps publishedData intact, just marks as unpublished)
	 */
	async unpublishDoc(
		organizationId: string,
		id: string,
		expectedRevision?: number
	): Promise<Document | null> {
		const now = new Date();

		const conditions = [
			eq(this.tables.documents.id, id),
			eq(this.tables.documents.organizationId, organizationId)
		];
		if (expectedRevision !== undefined) {
			conditions.push(eq(this.tables.documents.revision, expectedRevision));
		}

		const result = await this.db
			.update(this.tables.documents)
			.set({
				status: DOCUMENT_STATUS.UNPUBLISHED,
				updatedAt: now
			})
			.where(and(...conditions))
			.returning();

		if (result[0]) return result[0] as Document;

		if (expectedRevision !== undefined) {
			const current = await this.findByDocIdAdvanced(organizationId, id);
			if (current) {
				throw new RevisionConflictError(
					`Document ${id} was modified since it was last read (expected revision ${expectedRevision}, current is ${current.revision})`,
					id,
					expectedRevision,
					current.revision
				);
			}
		}

		return null;
	}

	/**
	 * Delete document permanently
	 */
	async deleteDocById(organizationId: string, id: string): Promise<boolean> {
		const result = await this.db
			.delete(this.tables.documents)
			.where(
				and(
					eq(this.tables.documents.id, id),
					eq(this.tables.documents.organizationId, organizationId)
				)
			)
			.returning({ id: this.tables.documents.id });

		if (result.length > 0) {
			await this.searchIndexReady;
			await this.db.run(sql`DELETE FROM cms_documents_fts WHERE doc_id = ${id}`);
		}

		return result.length > 0;
	}

	/**
	 * Recompute the precomputed full-text search column and its FTS5 shadow row.
	 * Best-effort — see `DocumentAdapter.updateSearchText`. Delete+reinsert (not
	 * UPDATE) because FTS5 has known duplicate-row issues on UPDATE.
	 */
	async updateSearchText(organizationId: string, id: string, searchText: string): Promise<void> {
		await this.searchIndexReady;
		await this.db.transaction(async (tx) => {
			await tx
				.update(this.tables.documents)
				.set({ searchText })
				.where(
					and(
						eq(this.tables.documents.id, id),
						eq(this.tables.documents.organizationId, organizationId)
					)
				);
			await tx.run(sql`DELETE FROM cms_documents_fts WHERE doc_id = ${id}`);
			await tx.run(
				sql`INSERT INTO cms_documents_fts (doc_id, search_text) VALUES (${id}, ${searchText})`
			);
		});
	}

	/**
	 * Count documents by type
	 */
	async countDocsByType(organizationId: string, type: string): Promise<number> {
		const result = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(this.tables.documents)
			.where(
				and(
					eq(this.tables.documents.organizationId, organizationId),
					eq(this.tables.documents.type, type)
				)
			);

		return Number(result[0]?.count) || 0;
	}

	/**
	 * Get counts for all document types
	 */
	async getDocCountsByType(organizationId: string): Promise<Record<string, number>> {
		const result = await this.db
			.select({
				type: this.tables.documents.type,
				count: sql<number>`count(*)`
			})
			.from(this.tables.documents)
			.where(eq(this.tables.documents.organizationId, organizationId))
			.groupBy(this.tables.documents.type);

		const counts: Record<string, number> = {};
		result.forEach((row) => {
			counts[row.type] = Number(row.count);
		});

		return counts;
	}

	async countDocsByTypeMultiOrg(organizationIds: string[], type: string): Promise<number> {
		const result = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(this.tables.documents)
			.where(
				and(
					inArray(this.tables.documents.organizationId, organizationIds),
					eq(this.tables.documents.type, type)
				)
			);
		return Number(result[0]?.count) || 0;
	}

	async getDocCountsByTypeMultiOrg(organizationIds: string[]): Promise<Record<string, number>> {
		const result = await this.db
			.select({
				type: this.tables.documents.type,
				count: sql<number>`count(*)`
			})
			.from(this.tables.documents)
			.where(inArray(this.tables.documents.organizationId, organizationIds))
			.groupBy(this.tables.documents.type);

		const counts: Record<string, number> = {};
		result.forEach((row) => {
			counts[row.type] = Number(row.count);
		});
		return counts;
	}

	async findDocByIdInOrgs(organizationIds: string[], id: string): Promise<Document | null> {
		const result = await this.db
			.select()
			.from(this.tables.documents)
			.where(
				and(
					eq(this.tables.documents.id, id),
					inArray(this.tables.documents.organizationId, organizationIds)
				)
			)
			.limit(1);
		return (result[0] as Document) || null;
	}

	/**
	 * Advanced filtering - find many documents with where clause and pagination
	 */
	async findManyDocAdvanced(
		organizationId: string,
		collectionName: string,
		options: FindOptions = {}
	): Promise<FindResult<Document>> {
		const {
			where,
			limit = DEFAULT_LIMIT,
			offset = DEFAULT_OFFSET,
			sort,
			search,
			depth = 0,
			perspective = 'draft',
			filterOrganizationIds
		} = options;

		// Build base conditions
		const baseConditions = [eq(this.tables.documents.type, collectionName)];

		// If filterOrganizationIds is provided, filter by those specific orgs (for hierarchy support)
		// Otherwise, filter by the single organizationId
		if (filterOrganizationIds && filterOrganizationIds.length > 0) {
			baseConditions.push(inArray(this.tables.documents.organizationId, filterOrganizationIds));
		} else if (organizationId) {
			// Only filter by organizationId if provided (empty string means overrideAccess mode)
			baseConditions.push(eq(this.tables.documents.organizationId, organizationId));
		}

		// When querying published perspective, exclude unpublished documents
		if (perspective === 'published') {
			baseConditions.push(eq(this.tables.documents.status, DOCUMENT_STATUS.PUBLISHED));
		}

		// Full-text search: resolve rank-ordered matching doc ids from the FTS5
		// shadow table first, then filter/paginate through the normal query
		// builder below — no hand-rolled raw joined SQL needed. `rankedIds` stays
		// null when no search is active; an empty array means "search active but
		// zero matches" (short-circuits to no results via the 1=0 fallback).
		let rankedIds: string[] | null = null;
		if (search) {
			await this.searchIndexReady;
			const ftsQuery = toFts5Query(search);
			rankedIds = [];
			if (ftsQuery) {
				const matches = (await this.db.all(
					sql`SELECT doc_id FROM cms_documents_fts WHERE cms_documents_fts MATCH ${ftsQuery} ORDER BY bm25(cms_documents_fts)`
				)) as Array<{ doc_id: string }>;
				rankedIds = matches.map((row) => row.doc_id);
			}
			baseConditions.push(
				rankedIds.length > 0 ? inArray(this.tables.documents.id, rankedIds) : sql`1 = 0`
			);
		}

		// Parse where clause with JSON support
		const whereCondition = parseWhere(where, this.tables.documents, perspective);

		// Combine base conditions with where clause
		const allConditions = whereCondition
			? and(...baseConditions, whereCondition)
			: and(...baseConditions);

		// Get total count (before pagination)
		const countQuery = this.db
			.select({ count: sql<number>`count(*)` })
			.from(this.tables.documents)
			.where(allConditions!);
		const countResult = await countQuery;
		const totalDocs = Number(countResult[0]?.count) || 0;

		// Add sorting (always include id as tiebreaker for deterministic pagination).
		// An explicit sort always wins; a search with no explicit sort ranks by
		// relevance. Relevance order can't be expressed as a SQL ORDER BY here (the
		// rank lives in a separate FTS5 table), so that case fetches every matching
		// row and paginates in JS instead of via SQL LIMIT/OFFSET.
		const orderBy = parseSort(sort, this.tables.documents, perspective);
		const useRelevanceOrder = rankedIds !== null && orderBy.length === 0;

		let docs: (typeof this.tables.documents.$inferSelect)[];
		if (useRelevanceOrder) {
			let full = this.db.select().from(this.tables.documents);
			if (allConditions) full = full.where(allConditions) as any;
			const allDocs = await full;
			const rankIndex = new Map(rankedIds!.map((id, i) => [id, i]));
			allDocs.sort((a, b) => (rankIndex.get(a.id) ?? 0) - (rankIndex.get(b.id) ?? 0));
			docs = allDocs.slice(offset, offset + limit);
		} else {
			let query = this.db.select().from(this.tables.documents);
			if (allConditions) {
				query = query.where(allConditions) as any;
			}
			if (orderBy.length > 0) {
				query = query.orderBy(...orderBy, this.tables.documents.id) as any;
			} else {
				// Default sort by updatedAt desc, id as tiebreaker
				query = query.orderBy(
					desc(this.tables.documents.updatedAt),
					this.tables.documents.id
				) as any;
			}
			docs = await query.limit(limit).offset(offset);
		}

		// Resolve references if depth > 0
		let finalDocs: Document[] = docs as Document[];
		if (depth > 0) {
			finalDocs = (await Promise.all(
				docs.map((doc) => resolveReferences(doc as Document, this, organizationId, { depth }))
			)) as Document[];
		}

		// Calculate pagination metadata
		const totalPages = Math.ceil(totalDocs / limit);
		const currentPage = Math.floor(offset / limit) + 1;

		return {
			docs: finalDocs,
			totalDocs,
			limit,
			offset,
			page: currentPage,
			totalPages,
			hasNextPage: currentPage < totalPages,
			hasPrevPage: currentPage > 1
		};
	}

	/**
	 * Advanced filtering - find document by ID with options
	 */
	async findByDocIdAdvanced(
		organizationId: string,
		id: string,
		options: Partial<FindOptions> = {}
	): Promise<Document | null> {
		const { depth = 0, filterOrganizationIds } = options;

		// Build conditions
		const baseConditions = [eq(this.tables.documents.id, id)];

		// If filterOrganizationIds is provided, filter by those specific orgs (for hierarchy support)
		// Otherwise, filter by the single organizationId
		if (filterOrganizationIds && filterOrganizationIds.length > 0) {
			baseConditions.push(inArray(this.tables.documents.organizationId, filterOrganizationIds));
		} else if (organizationId) {
			// Only filter by organizationId if provided (empty string means overrideAccess mode)
			baseConditions.push(eq(this.tables.documents.organizationId, organizationId));
		}

		const result = await this.db
			.select()
			.from(this.tables.documents)
			.where(and(...baseConditions))
			.limit(1);

		if (result.length === 0) {
			return null;
		}

		let doc: Document = result[0] as Document;

		// Resolve references if depth > 0
		if (depth > 0) {
			doc = (await resolveReferences(doc, this, organizationId, { depth })) as Document;
		}

		return doc;
	}

	/**
	 * Count documents matching where clause
	 */
	async countDocuments(
		organizationId: string,
		collectionName: string,
		where?: Where
	): Promise<number> {
		// Build base conditions
		const baseConditions = [eq(this.tables.documents.type, collectionName)];

		// Only filter by organizationId if provided (empty string means overrideAccess mode)
		if (organizationId) {
			baseConditions.push(eq(this.tables.documents.organizationId, organizationId));
		}

		// Parse where clause with JSON support
		const whereCondition = parseWhere(where, this.tables.documents, 'draft');

		// Combine conditions
		const allConditions = whereCondition
			? and(...baseConditions, whereCondition)
			: and(...baseConditions);

		const result = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(this.tables.documents)
			.where(allConditions!);

		return Number(result[0]?.count) || 0;
	}

	/**
	 * Find documents that reference a specific asset ID in their JSON data
	 */
	async findDocumentsReferencingAsset(
		organizationId: string,
		assetId: string,
		knownTypes?: string[]
	): Promise<Array<{ documentId: string; type: string; title: string; status: string | null }>> {
		const pattern = '%' + assetId + '%';
		// JSON data columns are plain TEXT in SQLite — LIKE directly, no ::text cast
		const conditions = [
			eq(this.tables.documents.organizationId, organizationId),
			sql`CASE WHEN ${this.tables.documents.status} = 'published' THEN ${this.tables.documents.publishedData} LIKE ${pattern} ELSE ${this.tables.documents.draftData} LIKE ${pattern} END`
		];
		if (knownTypes && knownTypes.length > 0) {
			conditions.push(inArray(this.tables.documents.type, knownTypes));
		}

		const results = await this.db
			.select({
				id: this.tables.documents.id,
				type: this.tables.documents.type,
				status: this.tables.documents.status,
				draftData: this.tables.documents.draftData
			})
			.from(this.tables.documents)
			.where(and(...conditions));

		return results.map((row) => ({
			documentId: row.id,
			type: row.type,
			title: (row.draftData as any)?.title || (row.draftData as any)?.name || row.type,
			status: row.status
		}));
	}

	/**
	 * Count document references for multiple asset IDs in batch
	 */
	async countDocumentReferencesForAssets(
		organizationId: string,
		assetIds: string[],
		knownTypes?: string[]
	): Promise<Record<string, number>> {
		if (assetIds.length === 0) return {};

		const counts: Record<string, number> = {};
		for (const id of assetIds) {
			counts[id] = 0;
		}

		const conditions = [eq(this.tables.documents.organizationId, organizationId)];
		if (knownTypes && knownTypes.length > 0) {
			conditions.push(inArray(this.tables.documents.type, knownTypes));
		}

		// Check the status-appropriate data column: published docs check
		// publishedData, everything else checks draftData.
		const assetConditions = assetIds.map((id) => {
			const pattern = '%' + id + '%';
			return sql`CASE WHEN ${this.tables.documents.status} = 'published' THEN ${this.tables.documents.publishedData} LIKE ${pattern} ELSE ${this.tables.documents.draftData} LIKE ${pattern} END`;
		});

		const results = await this.db
			.select({
				id: this.tables.documents.id,
				status: this.tables.documents.status,
				draftData: this.tables.documents.draftData,
				publishedData: this.tables.documents.publishedData
			})
			.from(this.tables.documents)
			.where(and(...conditions, drizzleOr(...assetConditions)));

		for (const row of results) {
			const text =
				row.status === 'published'
					? JSON.stringify(row.publishedData)
					: JSON.stringify(row.draftData);
			for (const assetId of assetIds) {
				if (text.includes(assetId)) {
					counts[assetId] = (counts[assetId] ?? 0) + 1;
				}
			}
		}

		return counts;
	}

	/**
	 * Clear all references to a deleted asset from document data. Returns the
	 * number of documents actually modified.
	 *
	 * Scope, deliberately:
	 * - **`draftData` on every document**, whatever its status. This is where an
	 *   editor sees the reference, and clearing it means the ref also leaves
	 *   `publishedData` on the next publish, through the normal flow.
	 * - **`publishedData` only on non-published documents** — the stale copy left
	 *   behind after an unpublish.
	 *
	 * It never rewrites `publishedData` on a *published* document. That column is
	 * written only by publish; mutating it from a delete would desync the content
	 * hash and produce published data matching no version. The asset's bytes are
	 * gone either way, so stripping the ref buys nothing a null-safe renderer
	 * doesn't already handle.
	 *
	 * No type filter: a document whose schema type is no longer registered still
	 * holds the reference, and is precisely the case a force-delete leaves behind.
	 */
	async clearAssetReferences(organizationId: string, assetId: string): Promise<number> {
		const pattern = '%' + assetId + '%';
		const rows = await this.db
			.select({
				id: this.tables.documents.id,
				status: this.tables.documents.status,
				draftData: this.tables.documents.draftData,
				publishedData: this.tables.documents.publishedData
			})
			.from(this.tables.documents)
			.where(
				and(
					eq(this.tables.documents.organizationId, organizationId),
					drizzleOr(
						sql`${this.tables.documents.draftData} LIKE ${pattern}`,
						and(
							sql`${this.tables.documents.status} != 'published'`,
							sql`${this.tables.documents.publishedData} LIKE ${pattern}`
						)
					)
				)
			);

		let cleared = 0;
		for (const row of rows) {
			const patch: Record<string, unknown> = {};

			const draft = stripAssetId(row.draftData, assetId);
			// stripAssetId always rebuilds objects, so identity comparison would
			// report a change on every row. Compare serialized forms instead.
			if (JSON.stringify(draft) !== JSON.stringify(row.draftData)) {
				patch.draftData = draft;
			}

			if (row.status !== 'published') {
				const published = stripAssetId(row.publishedData, assetId);
				if (JSON.stringify(published) !== JSON.stringify(row.publishedData)) {
					patch.publishedData = published;
				}
			}

			if (Object.keys(patch).length === 0) continue;

			await this.db
				.update(this.tables.documents)
				.set(patch)
				.where(eq(this.tables.documents.id, row.id));
			cleared++;
		}
		return cleared;
	}

	// ============================================
	// VERSION HISTORY
	// ============================================

	async listDocumentVersions(
		organizationId: string,
		documentId: string,
		options?: { limit?: number; offset?: number }
	): Promise<DocumentVersionList> {
		if (!this.tables.documentVersions) {
			return { versions: [], total: 0 };
		}

		const limit = options?.limit ?? 25;
		const offset = options?.offset ?? 0;

		const [versions, countResult] = await Promise.all([
			this.db
				.select()
				.from(this.tables.documentVersions)
				.where(
					and(
						eq(this.tables.documentVersions.documentId, documentId),
						eq(this.tables.documentVersions.organizationId, organizationId)
					)
				)
				.orderBy(desc(this.tables.documentVersions.versionNumber))
				.limit(limit)
				.offset(offset),
			this.db
				.select({ count: sql<number>`count(*)` })
				.from(this.tables.documentVersions)
				.where(
					and(
						eq(this.tables.documentVersions.documentId, documentId),
						eq(this.tables.documentVersions.organizationId, organizationId)
					)
				)
		]);

		return {
			versions: versions as DocumentVersion[],
			total: Number(countResult[0]?.count ?? 0)
		};
	}

	async getDocumentVersion(
		organizationId: string,
		documentId: string,
		versionNumber: number
	): Promise<DocumentVersion | null> {
		if (!this.tables.documentVersions) return null;

		const result = await this.db
			.select()
			.from(this.tables.documentVersions)
			.where(
				and(
					eq(this.tables.documentVersions.documentId, documentId),
					eq(this.tables.documentVersions.organizationId, organizationId),
					eq(this.tables.documentVersions.versionNumber, versionNumber)
				)
			)
			.limit(1);

		return (result[0] as DocumentVersion) || null;
	}

	async createDocumentVersion(data: {
		documentId: string;
		organizationId: string;
		eventType: 'draft' | 'publish';
		data: any;
		createdBy?: string | null;
	}): Promise<DocumentVersion | null> {
		if (!this.tables.documentVersions) return null;

		// Get next version number
		const latest = await this.db
			.select({ versionNumber: this.tables.documentVersions.versionNumber })
			.from(this.tables.documentVersions)
			.where(eq(this.tables.documentVersions.documentId, data.documentId))
			.orderBy(desc(this.tables.documentVersions.versionNumber))
			.limit(1);

		const nextVersion = (latest[0]?.versionNumber ?? 0) + 1;

		const result = await this.db
			.insert(this.tables.documentVersions)
			.values({
				documentId: data.documentId,
				organizationId: data.organizationId,
				versionNumber: nextVersion,
				eventType: data.eventType,
				data: data.data,
				createdBy: data.createdBy ?? null
			})
			.returning();

		return (result[0] as DocumentVersion) || null;
	}

	async deleteDocumentVersions(documentId: string, versionIds: string[]): Promise<void> {
		if (!this.tables.documentVersions || versionIds.length === 0) return;

		await this.db
			.delete(this.tables.documentVersions)
			.where(
				and(
					eq(this.tables.documentVersions.documentId, documentId),
					inArray(this.tables.documentVersions.id, versionIds)
				)
			);
	}
}
