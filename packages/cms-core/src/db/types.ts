// Database-agnostic types for Aphex CMS
// These types define the data structures independent of the database implementation

/**
 * Document type - represents a CMS document
 */
export interface Document {
  id: string;
  type: string;
  status: 'draft' | 'published' | null;
  draftData: any;
  publishedData: any;
  publishedHash: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  publishedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/**
 * New document input type
 */
export interface NewDocument {
  id?: string;
  type: string;
  status?: 'draft' | 'published' | null;
  draftData?: any;
  publishedData?: any;
  publishedHash?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  publishedAt?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

/**
 * Asset type - represents uploaded files
 */
export interface Asset {
  id: string;
  assetType: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  url: string;
  path: string;
  width: number | null;
  height: number | null;
  metadata: any;
  title: string | null;
  description: string | null;
  alt: string | null;
  creditLine: string | null;
  createdBy: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/**
 * New asset input type
 */
export interface NewAsset {
  id?: string;
  assetType: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  url: string;
  path: string;
  width?: number | null;
  height?: number | null;
  metadata?: any;
  title?: string | null;
  description?: string | null;
  alt?: string | null;
  creditLine?: string | null;
  createdBy?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

/**
 * Schema type - represents document and object type definitions
 */
export interface SchemaType {
  id: string;
  name: string;
  title: string;
  type: 'document' | 'object';
  description: string | null;
  schema: any;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/**
 * New schema type input type
 */
export interface NewSchemaType {
  id?: string;
  name: string;
  title: string;
  type: 'document' | 'object';
  description?: string | null;
  schema: any;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}
