import type { StorageAdapter } from '../storage/interfaces/storage.js';
import type { DatabaseAdapter } from '../db/interfaces/index.js';
import type { Asset } from '../db/schema.js';
export interface AssetUploadData {
    buffer: Buffer;
    originalFilename: string;
    mimeType: string;
    size: number;
    title?: string;
    description?: string;
    alt?: string;
    creditLine?: string;
}
export interface AssetFilters {
    assetType?: 'image' | 'file';
    mimeType?: string;
    search?: string;
    limit?: number;
    offset?: number;
}
/**
 * Asset service - coordinates storage and database operations
 * Maintains separation of concerns while providing unified asset management
 */
export declare class AssetService {
    private storage;
    private database;
    constructor(storage: StorageAdapter, database: DatabaseAdapter);
    /**
     * Upload and store an asset
     */
    uploadAsset(data: AssetUploadData): Promise<Asset>;
    /**
     * Find asset by ID
     */
    findAssetById(id: string): Promise<Asset | null>;
    /**
     * Find multiple assets with filtering
     */
    findAssets(filters?: AssetFilters): Promise<Asset[]>;
    /**
     * Delete asset (both file and database record)
     */
    deleteAsset(id: string): Promise<boolean>;
    /**
     * Update asset metadata
     */
    updateAssetMetadata(id: string, metadata: {
        title?: string;
        description?: string;
        alt?: string;
        creditLine?: string;
    }): Promise<Asset | null>;
    /**
     * Get asset statistics
     */
    getAssetStats(): Promise<{
        totalAssets: number;
        totalImages: number;
        totalFiles: number;
        totalSize: number;
    }>;
    /**
     * Get health status of both storage and database
     */
    getHealthStatus(): Promise<{
        storage: boolean;
        database: boolean;
    }>;
}
//# sourceMappingURL=asset-service.d.ts.map