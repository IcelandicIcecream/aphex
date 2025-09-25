// Database operations for documents
import { db } from '$lib/server/db/index.js';
import { documents, type Document, type NewDocument } from '$lib/server/db/schema.js';
import { eq, and, desc } from 'drizzle-orm';

export interface DocumentFilters {
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

// Default values
const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;
const DEFAULT_STATUS = 'draft';

// Document status constants
export const DOCUMENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published'
} as const;

export type DocumentStatus = typeof DOCUMENT_STATUS[keyof typeof DOCUMENT_STATUS];

export class DocumentsDB {
  /**
   * Get all documents with optional filtering
   */
  static async findMany(filters: DocumentFilters = {}) {
    // Apply defaults
    const {
      type,
      status,
      limit = DEFAULT_LIMIT,
      offset = DEFAULT_OFFSET
    } = filters;

    // Build query step by step to avoid type issues
    const baseQuery = db.select().from(documents);

    // Apply filters
    const conditions = [];
    if (type) {
      conditions.push(eq(documents.type, type));
    }
    if (status) {
      conditions.push(eq(documents.status, status));
    }

    // Execute query with all conditions
    if (conditions.length > 0) {
      return await baseQuery
        .where(and(...conditions))
        .orderBy(desc(documents.updatedAt))
        .limit(limit)
        .offset(offset);
    }

    // No conditions - just ordering and pagination
    return await baseQuery
      .orderBy(desc(documents.updatedAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Get document by ID
   */
  static async findById(id: string): Promise<Document | null> {
    const result = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get document by slug and type
   */
  static async findBySlug(slug: string, type: string): Promise<Document | null> {
    const result = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.slug, slug),
        eq(documents.type, type)
      ))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create a new document (starts as draft)
   */
  static async create(data: { type: string; data: any }): Promise<Document> {
    const now = new Date();

    const result = await db
      .insert(documents)
      .values({
        type: data.type,
        status: DOCUMENT_STATUS.DRAFT,
        draftData: data.data,
        publishedData: null, // No published version yet
        publishedAt: null,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    return result[0];
  }

  /**
   * Update document draft data only
   */
  static async updateDraft(id: string, data: any): Promise<Document | null> {
    const now = new Date();

    const result = await db
      .update(documents)
      .set({
        draftData: data,
        updatedAt: now
      })
      .where(eq(documents.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Publish document (copy draft -> published)
   */
  static async publish(id: string): Promise<Document | null> {
    const now = new Date();

    // First get the current draft data
    const document = await this.findById(id);
    if (!document || !document.draftData) {
      return null;
    }

    const result = await db
      .update(documents)
      .set({
        status: DOCUMENT_STATUS.PUBLISHED,
        publishedData: document.draftData, // Copy draft to published
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
  static async unpublish(id: string): Promise<Document | null> {
    const now = new Date();

    const result = await db
      .update(documents)
      .set({
        status: DOCUMENT_STATUS.DRAFT,
        publishedData: null,
        publishedAt: null,
        updatedAt: now
      })
      .where(eq(documents.id, id))
      .returning();

    return result[0] || null;
  }

  /**
   * Delete document by ID
   */
  static async deleteById(id: string): Promise<boolean> {
    const result = await db
      .delete(documents)
      .where(eq(documents.id, id))
      .returning();

    return result.length > 0;
  }

  /**
   * Count documents by type
   */
  static async countByType(type: string): Promise<number> {
    const result = await db
      .select({ count: documents.id })
      .from(documents)
      .where(eq(documents.type, type));

    return result.length;
  }

  /**
   * Get document counts grouped by type
   */
  static async getCountsByType(): Promise<Record<string, number>> {
    const result = await db
      .select({
        type: documents.type,
        count: documents.id
      })
      .from(documents);

    // Group and count
    const counts: Record<string, number> = {};
    for (const row of result) {
      counts[row.type] = (counts[row.type] || 0) + 1;
    }

    return counts;
  }
}
