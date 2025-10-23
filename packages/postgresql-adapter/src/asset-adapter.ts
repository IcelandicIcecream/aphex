// PostgreSQL asset adapter implementation
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, desc, and, like, sql } from 'drizzle-orm';
import type {
	AssetAdapter,
	AssetFilters,
	CreateAssetData,
	UpdateAssetData,
	Asset
} from '@aphex/cms-core/server';
import type { CMSSchema } from './schema.js';

// Default values
const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;

/**
 * PostgreSQL asset adapter implementation
 * Handles all asset-related database operations
 */
export class PostgreSQLAssetAdapter implements AssetAdapter {
	private db: ReturnType<typeof drizzle>;
	private tables: CMSSchema;

	constructor(db: ReturnType<typeof drizzle>, tables: CMSSchema) {
		this.db = db;
		this.tables = tables;
	}

	/**
	 * Create new asset
	 */
	async createAsset(data: CreateAssetData): Promise<Asset> {
		const result = await this.db
			.insert(this.tables.assets)
			.values({
				organizationId: data.organizationId,
				assetType: data.assetType,
				filename: data.filename,
				originalFilename: data.originalFilename,
				mimeType: data.mimeType,
				size: data.size,
				url: data.url,
				path: data.path,
				storageAdapter: data.storageAdapter,
				width: data.width,
				height: data.height,
				metadata: data.metadata,
				title: data.title,
				description: data.description,
				alt: data.alt,
				creditLine: data.creditLine,
				createdBy: data.createdBy
			})
			.returning();

		return result[0]!;
	}

	/**
	 * Find asset by ID
	 */
	async findAssetById(organizationId: string, id: string): Promise<Asset | null> {
		try {
			const result = await this.db
				.select()
				.from(this.tables.assets)
				.where(
					and(eq(this.tables.assets.id, id), eq(this.tables.assets.organizationId, organizationId))
				)
				.limit(1);

			return result[0] || null;
		} catch (error) {
			console.error('Error finding asset by ID:', error);
			return null;
		}
	}

	/**
	 * Find multiple assets with filtering
	 */
	async findAssets(
		organizationId: string,
		filters: Omit<AssetFilters, 'organizationId'> = {}
	): Promise<Asset[]> {
		try {
			const {
				assetType,
				mimeType,
				search,
				limit = DEFAULT_LIMIT,
				offset = DEFAULT_OFFSET
			} = filters;

			// Build query conditions - ALWAYS include organizationId
			const conditions = [eq(this.tables.assets.organizationId, organizationId)];

			if (assetType) {
				conditions.push(eq(this.tables.assets.assetType, assetType));
			}

			if (mimeType) {
				conditions.push(eq(this.tables.assets.mimeType, mimeType));
			}

			if (search) {
				conditions.push(like(this.tables.assets.originalFilename, `%${search}%`));
			}

			// Build and execute query
			const result = await this.db
				.select()
				.from(this.tables.assets)
				.where(and(...conditions))
				.orderBy(desc(this.tables.assets.createdAt))
				.limit(limit)
				.offset(offset);

			return result;
		} catch (error) {
			console.error('Error finding assets:', error);
			return [];
		}
	}

	/**
	 * Find asset by ID (bypasses organization filter for public access)
	 * Uses raw SQL to bypass RLS policies
	 */
	async findAssetByIdGlobal(id: string): Promise<Asset | null> {
		try {
			const result = await this.db.execute(sql`
				SELECT * FROM ${this.tables.assets}
				WHERE id = ${id}
				LIMIT 1
			`);

			// Drizzle's execute returns an array directly with snake_case columns
			if (result && result.length > 0) {
				const raw = result[0] as any;
				return {
					id: raw.id,
					organizationId: raw.organization_id,
					assetType: raw.asset_type,
					filename: raw.filename,
					originalFilename: raw.original_filename,
					mimeType: raw.mime_type,
					size: raw.size,
					url: raw.url,
					path: raw.path,
					storageAdapter: raw.storage_adapter,
					width: raw.width,
					height: raw.height,
					metadata: raw.metadata,
					title: raw.title,
					description: raw.description,
					alt: raw.alt,
					creditLine: raw.credit_line,
					createdBy: raw.created_by,
					createdAt: raw.created_at,
					updatedAt: raw.updated_at
				} as Asset;
			}

			return null;
		} catch (error) {
			console.error('Error finding asset globally:', error);
			return null;
		}
	}

	/**
	 * Update asset metadata
	 */
	async updateAsset(
		organizationId: string,
		id: string,
		data: UpdateAssetData
	): Promise<Asset | null> {
		try {
			const result = await this.db
				.update(this.tables.assets)
				.set({
					...data,
					updatedAt: new Date()
				})
				.where(
					and(eq(this.tables.assets.id, id), eq(this.tables.assets.organizationId, organizationId))
				)
				.returning();

			return result[0] || null;
		} catch (error) {
			console.error('Error updating asset:', error);
			return null;
		}
	}

	/**
	 * Delete asset by ID
	 */
	async deleteAsset(organizationId: string, id: string): Promise<boolean> {
		try {
			const result = await this.db
				.delete(this.tables.assets)
				.where(
					and(eq(this.tables.assets.id, id), eq(this.tables.assets.organizationId, organizationId))
				)
				.returning({ id: this.tables.assets.id });

			return result.length > 0;
		} catch (error) {
			console.error('Error deleting asset:', error);
			return false;
		}
	}

	/**
	 * Count total assets
	 */
	async countAssets(organizationId: string): Promise<number> {
		try {
			const result = await this.db
				.select({ count: sql<number>`count(*)` })
				.from(this.tables.assets)
				.where(eq(this.tables.assets.organizationId, organizationId));

			return result[0]?.count || 0;
		} catch (error) {
			console.error('Error counting assets:', error);
			return 0;
		}
	}

	/**
	 * Count assets by type
	 */
	async countAssetsByType(organizationId: string): Promise<Record<string, number>> {
		try {
			const result = await this.db
				.select({
					assetType: this.tables.assets.assetType,
					count: sql<number>`count(*)`
				})
				.from(this.tables.assets)
				.where(eq(this.tables.assets.organizationId, organizationId))
				.groupBy(this.tables.assets.assetType);

			const counts: Record<string, number> = {};
			result.forEach((row) => {
				counts[row.assetType] = row.count;
			});

			return counts;
		} catch (error) {
			console.error('Error getting asset counts by type:', error);
			return {};
		}
	}

	/**
	 * Get total size of all assets
	 */
	async getTotalAssetsSize(organizationId: string): Promise<number> {
		try {
			const result = await this.db
				.select({ totalSize: sql<number>`sum(size)` })
				.from(this.tables.assets)
				.where(eq(this.tables.assets.organizationId, organizationId));

			return result[0]?.totalSize || 0;
		} catch (error) {
			console.error('Error getting total assets size:', error);
			return 0;
		}
	}
}
