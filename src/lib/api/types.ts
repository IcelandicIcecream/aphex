// API client types
import type { Document } from '$lib/db/index.js';

// API Response wrappers
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    count: number;
    limit: number;
    offset: number;
    filters: Record<string, any>;
  };
}

// Document-related types
export interface DocumentListParams {
  docType?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface CreateDocumentData {
  type: string;
  data: Record<string, any>;
  slug?: string;
  status?: string;
}

export interface UpdateDocumentData {
  data?: Record<string, any>;
  slug?: string | null;
  status?: string;
}

// Export document type for convenience
export type { Document };