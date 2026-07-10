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
import { createHashForPublishing } from '@aphexcms/cms-core/server';
import type { CMSSchema } from './schema';
import { resolveReferences } from './utils/reference-resolver';
import { parseWhere, parseSort } from './filter-parser';

// Default values
const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;

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

	constructor(db: ReturnType<typeof drizzle>, tables: CMSSchema) {
		this.db = db;
		this.tables = tables;
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
		updatedBy?: string
	): Promise<Document | null> {
		const now = new Date();

		const result = await this.db
			.update(this.tables.documents)
			.set({
				draftData: data,
				updatedBy,
				updatedAt: now
			})
			.where(
				and(
					eq(this.tables.documents.id, id),
					eq(this.tables.documents.organizationId, organizationId)
				)
			)
			.returning();

		return (result[0] as Document) || null;
	}

	/**
	 * Publish document (copy draft -> published)
	 */
	async publishDoc(organizationId: string, id: string): Promise<Document | null> {
		const now = new Date();

		// Get current document
		const current = await this.findByDocIdAdvanced(organizationId, id);
		if (!current || !current.draftData) {
			return null;
		}

		// Create content hash for change detection
		const contentHash = createHashForPublishing(current.draftData);

		const result = await this.db
			.update(this.tables.documents)
			.set({
				status: DOCUMENT_STATUS.PUBLISHED,
				publishedData: current.draftData,
				publishedHash: contentHash,
				publishedAt: now,
				updatedAt: now
			})
			.where(
				and(
					eq(this.tables.documents.id, id),
					eq(this.tables.documents.organizationId, organizationId)
				)
			)
			.returning();

		return (result[0] as Document) || null;
	}

	/**
	 * Unpublish document (soft — keeps publishedData intact, just marks as unpublished)
	 */
	async unpublishDoc(organizationId: string, id: string): Promise<Document | null> {
		const now = new Date();

		const result = await this.db
			.update(this.tables.documents)
			.set({
				status: DOCUMENT_STATUS.UNPUBLISHED,
				updatedAt: now
			})
			.where(
				and(
					eq(this.tables.documents.id, id),
					eq(this.tables.documents.organizationId, organizationId)
				)
			)
			.returning();

		return (result[0] as Document) || null;
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

		return result.length > 0;
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

		// Build query
		let query = this.db.select().from(this.tables.documents);

		if (allConditions) {
			query = query.where(allConditions) as any;
		}

		// Add sorting (always include id as tiebreaker for deterministic pagination)
		const orderBy = parseSort(sort, this.tables.documents, perspective);
		if (orderBy.length > 0) {
			query = query.orderBy(...orderBy, this.tables.documents.id) as any;
		} else {
			// Default sort by updatedAt desc, id as tiebreaker
			query = query.orderBy(desc(this.tables.documents.updatedAt), this.tables.documents.id) as any;
		}

		// Apply pagination
		const docs = await query.limit(limit).offset(offset);

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
	 * Clear all references to an asset from publishedData of non-published documents.
	 * Called after asset deletion so stale publishedData doesn't hold dangling refs.
	 * Only touches draft/unpublished docs — published docs block deletion upstream.
	 */
	async clearAssetFromPublishedData(organizationId: string, assetId: string): Promise<number> {
		const pattern = '%' + assetId + '%';
		const rows = await this.db
			.select({
				id: this.tables.documents.id,
				publishedData: this.tables.documents.publishedData
			})
			.from(this.tables.documents)
			.where(
				and(
					eq(this.tables.documents.organizationId, organizationId),
					sql`${this.tables.documents.status} != 'published'`,
					sql`${this.tables.documents.publishedData} LIKE ${pattern}`
				)
			);

		let cleared = 0;
		for (const row of rows) {
			const cleaned = stripAssetId(row.publishedData, assetId);
			if (cleaned !== row.publishedData) {
				await this.db
					.update(this.tables.documents)
					.set({ publishedData: cleaned })
					.where(eq(this.tables.documents.id, row.id));
				cleared++;
			}
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
