// Document interface for document operations
import type { Document } from '../schema.js';

export interface DocumentFilters {
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface CreateDocumentData {
  type: string;
  draftData: any;
  createdBy?: string; // User ID (optional for backward compatibility)
}

export interface UpdateDocumentData {
  draftData?: any;
  status?: string;
  updatedBy?: string; // User ID (optional for backward compatibility)
}

/**
 * Document adapter interface for document-specific operations
 */
export interface DocumentAdapter {
  // Document CRUD operations
  findMany(filters?: DocumentFilters): Promise<Document[]>;
  findById(id: string): Promise<Document | null>;
  create(data: CreateDocumentData): Promise<Document>;
  updateDraft(id: string, data: any, updatedBy?: string): Promise<Document | null>;
  deleteById(id: string): Promise<boolean>;

  // Publishing operations
  publish(id: string): Promise<Document | null>;
  unpublish(id: string): Promise<Document | null>;

  // Analytics/counts
  countByType(type: string): Promise<number>;
  getCountsByType(): Promise<Record<string, number>>;
}