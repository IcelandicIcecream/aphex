// PostgreSQL adapter - combines document and asset adapters
import postgres from 'postgres';
import { PostgreSQLDocumentAdapter } from './document-adapter.js';
import { PostgreSQLAssetAdapter } from './asset-adapter.js';
/**
 * Combined PostgreSQL adapter that implements the full DatabaseAdapter interface
 * Composes document and asset adapters into a single unified interface
 */
export class PostgreSQLAdapter {
    client;
    documentAdapter;
    assetAdapter;
    constructor(config) {
        // Merge user options with recommended defaults for connection pooling
        const defaultOptions = {
            max: 10, // Maximum connections in pool
            idle_timeout: 20, // Close idle connections after 20 seconds
            connect_timeout: 10 // Connection timeout in seconds
        };
        this.client = postgres(config.connectionString, {
            ...defaultOptions,
            ...config.options // User options override defaults
        });
        this.documentAdapter = new PostgreSQLDocumentAdapter(this.client);
        this.assetAdapter = new PostgreSQLAssetAdapter(this.client);
    }
    // Document operations - delegate to document adapter
    async findMany(filters) {
        return this.documentAdapter.findMany(filters);
    }
    async findById(id) {
        return this.documentAdapter.findById(id);
    }
    async create(data) {
        return this.documentAdapter.create(data);
    }
    async updateDraft(id, data) {
        return this.documentAdapter.updateDraft(id, data);
    }
    async deleteById(id) {
        return this.documentAdapter.deleteById(id);
    }
    async publish(id) {
        return this.documentAdapter.publish(id);
    }
    async unpublish(id) {
        return this.documentAdapter.unpublish(id);
    }
    async countByType(type) {
        return this.documentAdapter.countByType(type);
    }
    async getCountsByType() {
        return this.documentAdapter.getCountsByType();
    }
    // Asset operations - delegate to asset adapter
    async createAsset(data) {
        return this.assetAdapter.createAsset(data);
    }
    async findAssetById(id) {
        return this.assetAdapter.findAssetById(id);
    }
    async findAssets(filters) {
        return this.assetAdapter.findAssets(filters);
    }
    async updateAsset(id, data) {
        return this.assetAdapter.updateAsset(id, data);
    }
    async deleteAsset(id) {
        return this.assetAdapter.deleteAsset(id);
    }
    async countAssets() {
        return this.assetAdapter.countAssets();
    }
    async countAssetsByType() {
        return this.assetAdapter.countAssetsByType();
    }
    async getTotalAssetsSize() {
        return this.assetAdapter.getTotalAssetsSize();
    }
    // Connection management
    async disconnect() {
        await this.client.end();
    }
    // Health check
    async isHealthy() {
        try {
            // Test with a simple query on both tables
            await this.client `SELECT 1`;
            return true;
        }
        catch (error) {
            console.error('Database health check failed:', error);
            return false;
        }
    }
}
// Re-export for convenience
export { PostgreSQLDocumentAdapter } from './document-adapter.js';
export { PostgreSQLAssetAdapter } from './asset-adapter.js';
