// PostgreSQL document adapter implementation
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { createHashForPublishing } from '../../../utils/content-hash.js';
import { resolveReferences } from '../../utils/reference-resolver.js';
import * as schema from '../../schema.js';
import { documents } from '../../schema.js';
// Default values
const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;
// Document status constants
export const DOCUMENT_STATUS = {
    DRAFT: 'draft',
    PUBLISHED: 'published'
};
/**
 * PostgreSQL document adapter implementation
 * Handles all document-related database operations
 */
export class PostgreSQLDocumentAdapter {
    db;
    constructor(client) {
        this.db = drizzle(client, { schema });
    }
    /**
     * Get all documents with optional filtering
     */
    async findMany(filters = {}) {
        // Apply defaults
        const { type, status, limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET, depth = 0 } = filters;
        // Build query step by step to avoid type issues
        const baseQuery = this.db.select().from(documents);
        // Apply filters
        const conditions = [];
        if (type) {
            conditions.push(eq(documents.type, type));
        }
        if (status) {
            conditions.push(eq(documents.status, status));
        }
        let query = baseQuery;
        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }
        // Order and paginate
        const result = await query
            .orderBy(desc(documents.updatedAt))
            .limit(limit)
            .offset(offset);
        // Resolve references if depth > 0
        if (depth > 0) {
            return Promise.all(result.map((doc) => resolveReferences(doc, this, { depth })));
        }
        return result;
    }
    /**
     * Get document by ID
     */
    async findById(id, depth = 0) {
        const result = await this.db
            .select()
            .from(documents)
            .where(eq(documents.id, id))
            .limit(1);
        const document = result[0] || null;
        // Resolve references if depth > 0 and document exists
        if (document && depth > 0) {
            return resolveReferences(document, this, { depth });
        }
        return document;
    }
    /**
     * Create new document (always starts as draft)
     */
    async create(data) {
        const now = new Date();
        const result = await this.db
            .insert(documents)
            .values({
            type: data.type,
            status: DOCUMENT_STATUS.DRAFT,
            draftData: data.draftData,
            createdBy: data.createdBy,
            createdAt: now,
            updatedAt: now
        })
            .returning();
        return result[0];
    }
    /**
     * Update draft data (auto-save)
     */
    async updateDraft(id, data, updatedBy) {
        const now = new Date();
        const result = await this.db
            .update(documents)
            .set({
            draftData: data,
            updatedBy,
            updatedAt: now
        })
            .where(eq(documents.id, id))
            .returning();
        return result[0] || null;
    }
    /**
     * Publish document (copy draft -> published)
     */
    async publish(id) {
        const now = new Date();
        // Get current document
        const current = await this.findById(id);
        if (!current || !current.draftData) {
            return null;
        }
        // Create content hash for change detection
        const contentHash = await createHashForPublishing(current.draftData);
        const result = await this.db
            .update(documents)
            .set({
            status: DOCUMENT_STATUS.PUBLISHED,
            publishedData: current.draftData,
            publishedHash: contentHash,
            publishedAt: now,
            updatedAt: now
        })
            .where(eq(documents.id, id))
            .returning();
        return result[0] || null;
    }
    /**
     * Unpublish document (revert to draft only)
     */
    async unpublish(id) {
        const now = new Date();
        const result = await this.db
            .update(documents)
            .set({
            status: DOCUMENT_STATUS.DRAFT,
            publishedData: null,
            publishedHash: null,
            publishedAt: null,
            updatedAt: now
        })
            .where(eq(documents.id, id))
            .returning();
        return result[0] || null;
    }
    /**
     * Delete document permanently
     */
    async deleteById(id) {
        const result = await this.db
            .delete(documents)
            .where(eq(documents.id, id));
        return result.rowCount > 0;
    }
    /**
     * Count documents by type
     */
    async countByType(type) {
        const result = await this.db
            .select({ count: sql `count(*)` })
            .from(documents)
            .where(eq(documents.type, type));
        return result[0]?.count || 0;
    }
    /**
     * Get counts for all document types
     */
    async getCountsByType() {
        const result = await this.db
            .select({
            type: documents.type,
            count: sql `count(*)`
        })
            .from(documents)
            .groupBy(documents.type);
        const counts = {};
        result.forEach(row => {
            counts[row.type] = row.count;
        });
        return counts;
    }
}
