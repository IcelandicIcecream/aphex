// PostgreSQL adapter - combines document and asset adapters
import postgres from 'postgres';
import type { DatabaseAdapter, DatabaseConfig } from '../../interfaces/index.js';
import { PostgreSQLDocumentAdapter } from './document-adapter.js';
import { PostgreSQLAssetAdapter } from './asset-adapter.js';

/**
 * Combined PostgreSQL adapter that implements the full DatabaseAdapter interface
 * Composes document and asset adapters into a single unified interface
 */
export class PostgreSQLAdapter implements DatabaseAdapter {
  private client: ReturnType<typeof postgres>;
  private documentAdapter: PostgreSQLDocumentAdapter;
  private assetAdapter: PostgreSQLAssetAdapter;

  constructor(config: DatabaseConfig) {
    this.client = postgres(config.connectionString, config.options);
    this.documentAdapter = new PostgreSQLDocumentAdapter(this.client);
    this.assetAdapter = new PostgreSQLAssetAdapter(this.client);
  }

  // Document operations - delegate to document adapter
  async findMany(filters?: any) {
    return this.documentAdapter.findMany(filters);
  }

  async findById(id: string) {
    return this.documentAdapter.findById(id);
  }

  async create(data: any) {
    return this.documentAdapter.create(data);
  }

  async updateDraft(id: string, data: any) {
    return this.documentAdapter.updateDraft(id, data);
  }

  async deleteById(id: string) {
    return this.documentAdapter.deleteById(id);
  }

  async publish(id: string) {
    return this.documentAdapter.publish(id);
  }

  async unpublish(id: string) {
    return this.documentAdapter.unpublish(id);
  }

  async countByType(type: string) {
    return this.documentAdapter.countByType(type);
  }

  async getCountsByType() {
    return this.documentAdapter.getCountsByType();
  }

  // Asset operations - delegate to asset adapter
  async createAsset(data: any) {
    return this.assetAdapter.createAsset(data);
  }

  async findAssetById(id: string) {
    return this.assetAdapter.findAssetById(id);
  }

  async findAssets(filters?: any) {
    return this.assetAdapter.findAssets(filters);
  }

  async updateAsset(id: string, data: any) {
    return this.assetAdapter.updateAsset(id, data);
  }

  async deleteAsset(id: string) {
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
  async disconnect(): Promise<void> {
    await this.client.end();
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    try {
      // Test with a simple query on both tables
      await this.client`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

// Re-export for convenience
export { PostgreSQLDocumentAdapter } from './document-adapter.js';
export { PostgreSQLAssetAdapter } from './asset-adapter.js';