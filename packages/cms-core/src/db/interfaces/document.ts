// Document interface for document operations
import type { Document } from '$lib/server/db/schema.js';

export interface DocumentFilters {
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface CreateDocumentData {
  type: string;
  draftData: any;
}

export interface UpdateDocumentData {
  draftData?: any;
  status?: string;
}

/**
 * Document adapter interface for document-specific operations
 */
export interface DocumentAdapter {
  // Document CRUD operations
  findMany(filters?: DocumentFilters): Promise<Document[]>;
  findById(id: string): Promise<Document | null>;
  create(data: CreateDocumentData): Promise<Document>;
  updateDraft(id: string, data: any): Promise<Document | null>;
  deleteById(id: string): Promise<boolean>;

  // Publishing operations
  publish(id: string): Promise<Document | null>;
  unpublish(id: string): Promise<Document | null>;

  // Analytics/counts
  countByType(type: string): Promise<number>;
  getCountsByType(): Promise<Record<string, number>>;
}