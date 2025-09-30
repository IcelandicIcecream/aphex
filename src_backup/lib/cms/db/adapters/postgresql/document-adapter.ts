// PostgreSQL document adapter implementation
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, desc, sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '$lib/server/db/schema.js';
import { documents, documentStatusEnum, type Document } from '$lib/server/db/schema.js';
import { createHashForPublishing } from '$lib/cms/content-hash.js';
import type {
  DocumentAdapter,
  DatabaseConfig,
  DocumentFilters,
  CreateDocumentData
} from '../../interfaces/document.js';

// Default values
const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;

// Use the actual enum values from the schema
export const DOCUMENT_STATUS = {
  DRAFT: 'draft' as const,
  PUBLISHED: 'published' as const
} satisfies Record<string, typeof documentStatusEnum.enumValues[number]>;

export type DocumentStatus = typeof documentStatusEnum.enumValues[number];

/**
 * PostgreSQL document adapter implementation
 * Handles all document-related database operations
 */
export class PostgreSQLDocumentAdapter implements DocumentAdapter {
  private db: ReturnType<typeof drizzle>;

  constructor(client: ReturnType<typeof postgres>) {
    this.db = drizzle(client, { schema });
  }

  /**
   * Get all documents with optional filtering
   */
  async findMany(filters: DocumentFilters = {}): Promise<Document[]> {
    // Apply defaults
    const {
      type,
      status,
      limit = DEFAULT_LIMIT,
      offset = DEFAULT_OFFSET
    } = filters;

    // Build query step by step to avoid type issues
    const baseQuery = this.db.select().from(documents);

    // Apply filters
    const conditions = [];
    if (type) {
      conditions.push(eq(documents.type, type));
    }
    if (status) {
      conditions.push(eq(documents.status, status as DocumentStatus));
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

    return result;
  }

  /**
   * Get document by ID
   */
  async findById(id: string): Promise<Document | null> {
    const result = await this.db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Create new document (always starts as draft)
   */
  async create(data: CreateDocumentData): Promise<Document> {
    const now = new Date();

    const result = await this.db
      .insert(documents)
      .values({
        type: data.type,
        status: DOCUMENT_STATUS.DRAFT,
        draftData: data.draftData,
        createdAt: now,
        updatedAt: now
      })
      .returning();

    return result[0];
  }

  /**
   * Update draft data (auto-save)
   */
  async updateDraft(id: string, data: any): Promise<Document | null> {
    const now = new Date();

    const result = await this.db
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
  async publish(id: string): Promise<Document | null> {
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
  async unpublish(id: string): Promise<Document | null> {
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
  async deleteById(id: string): Promise<boolean> {
    const result = await this.db
      .delete(documents)
      .where(eq(documents.id, id));

    return result.rowCount > 0;
  }

  /**
   * Count documents by type
   */
  async countByType(type: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(eq(documents.type, type));

    return result[0]?.count || 0;
  }

  /**
   * Get counts for all document types
   */
  async getCountsByType(): Promise<Record<string, number>> {
    const result = await this.db
      .select({
        type: documents.type,
        count: sql<number>`count(*)`
      })
      .from(documents)
      .groupBy(documents.type);

    const counts: Record<string, number> = {};
    result.forEach(row => {
      counts[row.type] = row.count;
    });

    return counts;
  }
}