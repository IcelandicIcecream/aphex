// PostgreSQL document adapter implementation
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, or as drizzleOr, desc, sql, inArray } from 'drizzle-orm';
import type {
	DocumentAdapter,
	CreateDocumentData,
	Document,
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

// Document status constants
export const DOCUMENT_STATUS = {
	DRAFT: 'draft' as const,
	PUBLISHED: 'published' as const
};

export type DocumentStatus = 'draft' | 'published';

/**
 * PostgreSQL document adapter implementation
 * Handles all document-related database operations
 */
export class PostgreSQLDocumentAdapter implements DocumentAdapter {
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
				organizationId: data.organizationId,
				type: data.type,
				status: DOCUMENT_STATUS.DRAFT,
				draftData: data.draftData,
				createdBy: data.createdBy,
				createdAt: now,
				updatedAt: now
			})
			.returning();

		return result[0]!;
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

		return result[0] || null;
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

		return result[0] || null;
	}

	/**
	 * Unpublish document (revert to draft only)
	 */
	async unpublishDoc(organizationId: string, id: string): Promise<Document | null> {
		const now = new Date();

		const result = await this.db
			.update(this.tables.documents)
			.set({
				status: DOCUMENT_STATUS.DRAFT,
				publishedData: null,
				publishedHash: null,
				publishedAt: null,
				updatedAt: now
			})
			.where(
				and(
					eq(this.tables.documents.id, id),
					eq(this.tables.documents.organizationId, organizationId)
				)
			)
			.returning();

		return result[0] || null;
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

		// Parse where clause with JSONB support
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

		// Add sorting
		const orderBy = parseSort(sort, this.tables.documents, perspective);
		if (orderBy.length > 0) {
			query = query.orderBy(...orderBy) as any;
		} else {
			// Default sort by updatedAt desc
			query = query.orderBy(desc(this.tables.documents.updatedAt)) as any;
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

		// Parse where clause with JSONB support
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
	 * Find documents that reference a specific asset ID in their JSONB data
	 */
	async findDocumentsReferencingAsset(
		organizationId: string,
		assetId: string
	): Promise<Array<{ documentId: string; type: string; title: string; status: string | null }>> {
		const conditions = [
			eq(this.tables.documents.organizationId, organizationId),
			sql`(${this.tables.documents.draftData}::text LIKE ${'%' + assetId + '%'} OR ${this.tables.documents.publishedData}::text LIKE ${'%' + assetId + '%'})`
		];

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
		assetIds: string[]
	): Promise<Record<string, number>> {
		if (assetIds.length === 0) return {};

		const counts: Record<string, number> = {};
		for (const id of assetIds) {
			counts[id] = 0;
		}

		const conditions = [
			eq(this.tables.documents.organizationId, organizationId)
		];

		// Build OR condition for all asset IDs
		const assetConditions = assetIds.map(
			(id) => sql`(${this.tables.documents.draftData}::text LIKE ${'%' + id + '%'} OR ${this.tables.documents.publishedData}::text LIKE ${'%' + id + '%'})`
		);

		const results = await this.db
			.select({
				id: this.tables.documents.id,
				draftData: this.tables.documents.draftData,
				publishedData: this.tables.documents.publishedData
			})
			.from(this.tables.documents)
			.where(and(...conditions, drizzleOr(...assetConditions)));

		// Count which asset IDs each document references
		for (const row of results) {
			const text = JSON.stringify(row.draftData) + JSON.stringify(row.publishedData);
			for (const assetId of assetIds) {
				if (text.includes(assetId)) {
					counts[assetId] = (counts[assetId] ?? 0) + 1;
				}
			}
		}

		return counts;
	}
}
