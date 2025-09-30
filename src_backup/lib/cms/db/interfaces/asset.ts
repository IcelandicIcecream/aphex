// Asset interface for asset operations
import type { Asset } from '$lib/server/db/schema.js';

export interface AssetFilters {
  assetType?: 'image' | 'file';
  mimeType?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateAssetData {
  assetType: 'image' | 'file';
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  url: string;
  path: string;
  width?: number;
  height?: number;
  metadata?: any;
  title?: string;
  description?: string;
  alt?: string;
  creditLine?: string;
}

export interface UpdateAssetData {
  title?: string;
  description?: string;
  alt?: string;
  creditLine?: string;
}

/**
 * Asset adapter interface for asset-specific operations
 */
export interface AssetAdapter {
  // Asset CRUD operations
  createAsset(data: CreateAssetData): Promise<Asset>;
  findAssetById(id: string): Promise<Asset | null>;
  findAssets(filters?: AssetFilters): Promise<Asset[]>;
  updateAsset(id: string, data: UpdateAssetData): Promise<Asset | null>;
  deleteAsset(id: string): Promise<boolean>;

  // Asset analytics
  countAssets(): Promise<number>;
  countAssetsByType(): Promise<Record<string, number>>;
  getTotalAssetsSize(): Promise<number>;
}