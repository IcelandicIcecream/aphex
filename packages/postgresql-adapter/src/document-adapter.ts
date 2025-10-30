// PostgreSQL document adapter implementation
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import type {
	DocumentAdapter,
	DocumentFilters,
	CreateDocumentData,
	Document
} from '@aphexcms/cms-core/server';
import { createHashForPublishing } from '@aphexcms/cms-core/server';
import type { CMSSchema } from './schema';
import { resolveReferences } from './utils/reference-resolver';

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
	 * Get all documents with optional filtering
	 */
	async findManyDoc(
		organizationId: string,
		filters: Omit<DocumentFilters, 'organizationId'> = {}
	): Promise<Document[]> {
		// Apply defaults
		const {
			type,
			status,
			limit = DEFAULT_LIMIT,
			offset = DEFAULT_OFFSET,
			depth = 0,
			filterOrganizationIds
		} = filters;

		// Build query conditions
		const conditions = [];

		// If filterOrganizationIds is provided, filter by those specific orgs
		// RLS will ensure user has access to them (e.g., parent can access children)
		if (filterOrganizationIds && filterOrganizationIds.length > 0) {
			conditions.push(inArray(this.tables.documents.organizationId, filterOrganizationIds));
		} else {
			// Always filter by the current organizationId - don't show parent org documents
			conditions.push(eq(this.tables.documents.organizationId, organizationId));
		}

		if (type) {
			conditions.push(eq(this.tables.documents.type, type));
		}
		if (status) {
			conditions.push(eq(this.tables.documents.status, status as DocumentStatus));
		}

		// Build and execute query
		let query = this.db.select().from(this.tables.documents);

		// Only add WHERE clause if there are conditions
		if (conditions.length > 0) {
			query = query.where(and(...conditions)) as any;
		}

		const result = await query
			.orderBy(desc(this.tables.documents.updatedAt))
			.limit(limit)
			.offset(offset);

		// Resolve references if depth > 0
		if (depth > 0) {
			return Promise.all(
				result.map((doc) => resolveReferences(doc, this, organizationId, { depth }))
			);
		}

		return result;
	}

	/**
	 * Get document by ID
	 */
	async findByDocId(
		organizationId: string,
		id: string,
		depth: number = 0
	): Promise<Document | null> {
		const result = await this.db
			.select()
			.from(this.tables.documents)
			.where(
				and(
					eq(this.tables.documents.id, id),
					eq(this.tables.documents.organizationId, organizationId)
				)
			)
			.limit(1);

		const document = result[0] || null;

		// Resolve references if depth > 0 and document exists
		if (document && depth > 0) {
			return resolveReferences(document, this, organizationId, { depth });
		}

		return document;
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
		const current = await this.findByDocId(organizationId, id);
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

		return result[0]?.count || 0;
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
			counts[row.type] = row.count;
		});

		return counts;
	}
}
