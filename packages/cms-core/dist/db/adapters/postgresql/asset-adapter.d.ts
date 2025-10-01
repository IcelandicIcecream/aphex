import postgres from 'postgres';
import { type Asset } from '../../schema.js';
import type { AssetAdapter, AssetFilters, CreateAssetData, UpdateAssetData } from '../../interfaces/asset.js';
/**
 * PostgreSQL asset adapter implementation
 * Handles all asset-related database operations
 */
export declare class PostgreSQLAssetAdapter implements AssetAdapter {
    private db;
    constructor(client: ReturnType<typeof postgres>);
    /**
     * Create new asset
     */
    createAsset(data: CreateAssetData): Promise<Asset>;
    /**
     * Find asset by ID
     */
    findAssetById(id: string): Promise<Asset | null>;
    /**
     * Find multiple assets with filtering
     */
    findAssets(filters?: AssetFilters): Promise<Asset[]>;
    /**
     * Update asset metadata
     */
    updateAsset(id: string, data: UpdateAssetData): Promise<Asset | null>;
    /**
     * Delete asset by ID
     */
    deleteAsset(id: string): Promise<boolean>;
    /**
     * Count total assets
     */
    countAssets(): Promise<number>;
    /**
     * Count assets by type
     */
    countAssetsByType(): Promise<Record<string, number>>;
    /**
     * Get total size of all assets
     */
    getTotalAssetsSize(): Promise<number>;
}
//# sourceMappingURL=asset-adapter.d.ts.map