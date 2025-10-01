// PostgreSQL asset adapter implementation
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, desc, and, like, sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '../../schema.js';
import { assets } from '../../schema.js';
// Default values
const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;
/**
 * PostgreSQL asset adapter implementation
 * Handles all asset-related database operations
 */
export class PostgreSQLAssetAdapter {
    db;
    constructor(client) {
        this.db = drizzle(client, { schema });
    }
    /**
     * Create new asset
     */
    async createAsset(data) {
        const result = await this.db
            .insert(assets)
            .values({
            assetType: data.assetType,
            filename: data.filename,
            originalFilename: data.originalFilename,
            mimeType: data.mimeType,
            size: data.size,
            url: data.url,
            path: data.path,
            width: data.width,
            height: data.height,
            metadata: data.metadata,
            title: data.title,
            description: data.description,
            alt: data.alt,
            creditLine: data.creditLine
        })
            .returning();
        return result[0];
    }
    /**
     * Find asset by ID
     */
    async findAssetById(id) {
        try {
            const result = await this.db
                .select()
                .from(assets)
                .where(eq(assets.id, id))
                .limit(1);
            return result[0] || null;
        }
        catch (error) {
            console.error('Error finding asset by ID:', error);
            return null;
        }
    }
    /**
     * Find multiple assets with filtering
     */
    async findAssets(filters = {}) {
        try {
            const { assetType, mimeType, search, limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET } = filters;
            // Build query conditions
            const conditions = [];
            if (assetType) {
                conditions.push(eq(assets.assetType, assetType));
            }
            if (mimeType) {
                conditions.push(eq(assets.mimeType, mimeType));
            }
            if (search) {
                conditions.push(like(assets.originalFilename, `%${search}%`));
            }
            // Build query
            let query = this.db.select().from(assets);
            if (conditions.length > 0) {
                query = query.where(and(...conditions));
            }
            const result = await query
                .orderBy(desc(assets.createdAt))
                .limit(limit)
                .offset(offset);
            return result;
        }
        catch (error) {
            console.error('Error finding assets:', error);
            return [];
        }
    }
    /**
     * Update asset metadata
     */
    async updateAsset(id, data) {
        try {
            const result = await this.db
                .update(assets)
                .set({
                ...data,
                updatedAt: new Date()
            })
                .where(eq(assets.id, id))
                .returning();
            return result[0] || null;
        }
        catch (error) {
            console.error('Error updating asset:', error);
            return null;
        }
    }
    /**
     * Delete asset by ID
     */
    async deleteAsset(id) {
        try {
            const result = await this.db
                .delete(assets)
                .where(eq(assets.id, id));
            return result.rowCount > 0;
        }
        catch (error) {
            console.error('Error deleting asset:', error);
            return false;
        }
    }
    /**
     * Count total assets
     */
    async countAssets() {
        try {
            const result = await this.db
                .select({ count: sql `count(*)` })
                .from(assets);
            return result[0]?.count || 0;
        }
        catch (error) {
            console.error('Error counting assets:', error);
            return 0;
        }
    }
    /**
     * Count assets by type
     */
    async countAssetsByType() {
        try {
            const result = await this.db
                .select({
                assetType: assets.assetType,
                count: sql `count(*)`
            })
                .from(assets)
                .groupBy(assets.assetType);
            const counts = {};
            result.forEach(row => {
                counts[row.assetType] = row.count;
            });
            return counts;
        }
        catch (error) {
            console.error('Error getting asset counts by type:', error);
            return {};
        }
    }
    /**
     * Get total size of all assets
     */
    async getTotalAssetsSize() {
        try {
            const result = await this.db
                .select({ totalSize: sql `sum(size)` })
                .from(assets);
            return result[0]?.totalSize || 0;
        }
        catch (error) {
            console.error('Error getting total assets size:', error);
            return 0;
        }
    }
}
