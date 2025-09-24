// CMS Engine - Core functionality for managing content (Sanity-compatible)
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '../server/db/schema.js';
import type { CMSConfig, SchemaType, Document } from './types.js';

export class CMSEngine {
  private db: ReturnType<typeof drizzle>;
  private config: CMSConfig;

  constructor(config: CMSConfig) {
    this.config = config;

    // Initialize database connection
    const client = postgres(config.database.url);
    this.db = drizzle(client, { schema });
  }

  // Update config dynamically (for schema hot-reloading)
  updateConfig(newConfig: CMSConfig): void {
    this.config = newConfig;
    console.log('🔄 CMS config updated:', {
      schemaTypes: newConfig.schemaTypes.length,
      documents: newConfig.schemaTypes.filter(t => t.type === 'document').length,
      objects: newConfig.schemaTypes.filter(t => t.type === 'object').length
    });
  }

  // Initialize CMS - register schema types in database
  async initialize(): Promise<void> {
    console.log('🚀 Initializing CMS...');

    // Register all schema types
    for (const schemaType of this.config.schemaTypes) {
      await this.registerSchemaType(schemaType);
    }

    console.log('✅ CMS initialized successfully');
  }

  // Schema Type Management (Sanity-compatible)
  private async registerSchemaType(schemaTypeConfig: SchemaType): Promise<void> {
    const existing = await this.db
      .select()
      .from(schema.schemaTypes)
      .where(eq(schema.schemaTypes.name, schemaTypeConfig.name))
      .limit(1);

    if (existing.length === 0) {
      await this.db.insert(schema.schemaTypes).values({
        name: schemaTypeConfig.name,
        title: schemaTypeConfig.title,
        type: schemaTypeConfig.type,
        description: schemaTypeConfig.description,
        schema: schemaTypeConfig as any
      });
      console.log(`📝 Registered ${schemaTypeConfig.type}: ${schemaTypeConfig.name}`);
    } else {
      // Update existing schema type
      await this.db
        .update(schema.schemaTypes)
        .set({
          title: schemaTypeConfig.title,
          description: schemaTypeConfig.description,
          schema: schemaTypeConfig as any,
          updatedAt: new Date()
        })
        .where(eq(schema.schemaTypes.name, schemaTypeConfig.name));
      console.log(`🔄 Updated ${schemaTypeConfig.type}: ${schemaTypeConfig.name}`);
    }
  }

  // Document CRUD Operations (Sanity-compatible)
  async createDocument(type: string, data: Record<string, any>, slug?: string): Promise<Document> {
    const [document] = await this.db
      .insert(schema.documents)
      .values({
        type,
        slug,
        data,
        status: 'draft'
      })
      .returning();

    return {
      id: document.id,
      type: document.type,
      data: document.data as Record<string, any>,
      createdAt: document.createdAt!,
      updatedAt: document.updatedAt!
    };
  }

  async getDocument(id: string): Promise<Document | null> {
    const [document] = await this.db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.id, id))
      .limit(1);

    if (!document) return null;

    return {
      id: document.id,
      type: document.type,
      data: document.data as Record<string, any>,
      createdAt: document.createdAt!,
      updatedAt: document.updatedAt!
    };
  }

  async getDocumentBySlug(type: string, slug: string): Promise<Document | null> {
    const [document] = await this.db
      .select()
      .from(schema.documents)
      .where(and(
        eq(schema.documents.type, type),
        eq(schema.documents.slug, slug)
      ))
      .limit(1);

    if (!document) return null;

    return {
      id: document.id,
      type: document.type,
      data: document.data as Record<string, any>,
      createdAt: document.createdAt!,
      updatedAt: document.updatedAt!
    };
  }

  async updateDocument(id: string, data: Record<string, any>): Promise<Document | null> {
    const [document] = await this.db
      .update(schema.documents)
      .set({
        data,
        updatedAt: new Date()
      })
      .where(eq(schema.documents.id, id))
      .returning();

    if (!document) return null;

    return {
      id: document.id,
      type: document.type,
      data: document.data as Record<string, any>,
      createdAt: document.createdAt!,
      updatedAt: document.updatedAt!
    };
  }

  async deleteDocument(id: string): Promise<boolean> {
    const result = await this.db
      .delete(schema.documents)
      .where(eq(schema.documents.id, id));

    return result.count > 0;
  }

  async listDocuments(type: string, options: {
    limit?: number;
    offset?: number;
    status?: string;
  } = {}): Promise<{ docs: Document[]; total: number }> {
    const { limit = 50, offset = 0, status } = options;

    // Build where condition
    const conditions = [eq(schema.documents.type, type)];
    if (status) {
      conditions.push(eq(schema.documents.status, status));
    }
    const whereCondition = and(...conditions);

    // Get documents
    const docs = await this.db
      .select()
      .from(schema.documents)
      .where(whereCondition)
      .limit(limit)
      .offset(offset)
      .orderBy(schema.documents.createdAt);

    // Get total count
    const [{ count }] = await this.db
      .select({ count: sql`count(*)`.mapWith(Number) })
      .from(schema.documents)
      .where(whereCondition);

    return {
      docs: docs.map(doc => ({
        id: doc.id,
        type: doc.type,
        data: doc.data as Record<string, any>,
        createdAt: doc.createdAt!,
        updatedAt: doc.updatedAt!
      })),
      total: count
    };
  }

  // Schema Type utility methods (pure Sanity-style)
  async getSchemaType(name: string): Promise<SchemaType | null> {
    const [schemaType] = await this.db
      .select()
      .from(schema.schemaTypes)
      .where(eq(schema.schemaTypes.name, name))
      .limit(1);

    return schemaType ? schemaType.schema as SchemaType : null;
  }

  // Resolve type reference to actual schema (Sanity-style)
  getSchemaTypeByName(name: string): SchemaType | null {
    return this.config.schemaTypes.find(s => s.name === name) || null;
  }

  async listDocumentTypes(): Promise<Array<{ name: string; title: string; description?: string }>> {
    // Only return document types that exist in current config (Sanity-style)
    const currentSchemaNames = new Set(this.config.schemaTypes.map(s => s.name));

    const documentTypes = await this.db
      .select({
        name: schema.schemaTypes.name,
        title: schema.schemaTypes.title,
        description: schema.schemaTypes.description
      })
      .from(schema.schemaTypes)
      .where(eq(schema.schemaTypes.type, 'document'))
      .orderBy(schema.schemaTypes.title);

    // Filter to only show types that exist in current config
    return documentTypes
      .filter(d => currentSchemaNames.has(d.name))
      .map(d => ({
        name: d.name,
        title: d.title,
        description: d.description || undefined
      }));
  }

  async listObjectTypes(): Promise<Array<{ name: string; title: string; description?: string }>> {
    // Only return object types that exist in current config (Sanity-style)
    const currentSchemaNames = new Set(this.config.schemaTypes.map(s => s.name));

    const objectTypes = await this.db
      .select({
        name: schema.schemaTypes.name,
        title: schema.schemaTypes.title,
        description: schema.schemaTypes.description
      })
      .from(schema.schemaTypes)
      .where(eq(schema.schemaTypes.type, 'object'))
      .orderBy(schema.schemaTypes.title);

    // Filter to only show types that exist in current config
    return objectTypes
      .filter(o => currentSchemaNames.has(o.name))
      .map(o => ({
        name: o.name,
        title: o.title,
        description: o.description || undefined
      }));
  }
}

// Global CMS instance
let cmsInstance: CMSEngine | null = null;

export function createCMS(config: CMSConfig): CMSEngine {
  if (!cmsInstance) {
    cmsInstance = new CMSEngine(config);
  }
  return cmsInstance;
}

export function getCMS(): CMSEngine {
  if (!cmsInstance) {
    throw new Error('CMS not initialized. Call createCMS() first.');
  }
  return cmsInstance;
}
