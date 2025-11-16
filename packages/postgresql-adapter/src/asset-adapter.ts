// PostgreSQL asset adapter implementation
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, desc, and, like, sql, inArray } from 'drizzle-orm';
import type {
	AssetAdapter,
	AssetFilters,
	CreateAssetData,
	UpdateAssetData,
	Asset,
	FindOptions,
	FindResult,
	Where
} from '@aphexcms/cms-core/server';
import type { CMSSchema } from './schema';
import { parseWhere, parseSort } from './filter-parser';

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
	 * Find asset by ID across multiple organizations (single query)
	 */
	async findAssetByIdInOrgs(organizationIds: string[], id: string): Promise<Asset | null> {
		try {
			if (organizationIds.length === 0) {
				return null;
			}

			const result = await this.db
				.select()
				.from(this.tables.assets)
				.where(
					and(
						eq(this.tables.assets.id, id),
						inArray(this.tables.assets.organizationId, organizationIds)
					)
				)
				.limit(1);

			return result[0] || null;
		} catch (error) {
			console.error('Error finding asset by ID in orgs:', error);
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
				offset = DEFAULT_OFFSET,
				filterOrganizationIds
			} = filters as any; // Cast to any to access filterOrganizationIds

			// Build query conditions
			const conditions = [];

			// If filterOrganizationIds is provided, filter by those specific orgs
			// Otherwise filter by the current organizationId
			if (filterOrganizationIds && filterOrganizationIds.length > 0) {
				conditions.push(inArray(this.tables.assets.organizationId, filterOrganizationIds));
			} else {
				conditions.push(eq(this.tables.assets.organizationId, organizationId));
			}

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

	/**
	 * Advanced filtering - find many assets with where clause and pagination
	 */
	async findManyAssetsAdvanced(
		organizationId: string,
		options: FindOptions = {}
	): Promise<FindResult<Asset>> {
		const { where, limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET, sort } = options;

		// Build base conditions
		const baseConditions = [eq(this.tables.assets.organizationId, organizationId)];

		// Parse where clause (assets don't have JSONB data like documents)
		const whereCondition = parseWhere(where, this.tables.assets, 'draft');

		// Combine conditions
		const allConditions = whereCondition
			? and(...baseConditions, whereCondition)
			: and(...baseConditions);

		// Get total count
		const countResult = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(this.tables.assets)
			.where(allConditions!);
		const totalDocs = countResult[0]?.count || 0;

		// Build query
		let query = this.db.select().from(this.tables.assets);

		if (allConditions) {
			query = query.where(allConditions) as any;
		}

		// Add sorting
		const orderBy = parseSort(sort, this.tables.assets, 'draft');
		if (orderBy.length > 0) {
			query = query.orderBy(...orderBy) as any;
		} else {
			// Default sort by createdAt desc
			query = query.orderBy(desc(this.tables.assets.createdAt)) as any;
		}

		// Apply pagination
		const docs = await query.limit(limit).offset(offset);

		// Calculate pagination metadata
		const totalPages = Math.ceil(totalDocs / limit);
		const currentPage = Math.floor(offset / limit) + 1;

		return {
			docs,
			totalDocs,
			limit,
			offset,
			page: currentPage,
			totalPages,
			hasNextPage: currentPage < totalPages,
			hasPrevPage: currentPage > 1
		};
	}

	/**
	 * Advanced filtering - find asset by ID
	 */
	async findAssetByIdAdvanced(organizationId: string, id: string): Promise<Asset | null> {
		const result = await this.db
			.select()
			.from(this.tables.assets)
			.where(
				and(eq(this.tables.assets.id, id), eq(this.tables.assets.organizationId, organizationId))
			)
			.limit(1);

		return result[0] || null;
	}

	/**
	 * Count assets matching where clause
	 */
	async countAssetsAdvanced(organizationId: string, where?: Where): Promise<number> {
		// Build base conditions
		const baseConditions = [eq(this.tables.assets.organizationId, organizationId)];

		// Parse where clause
		const whereCondition = parseWhere(where, this.tables.assets, 'draft');

		// Combine conditions
		const allConditions = whereCondition
			? and(...baseConditions, whereCondition)
			: and(...baseConditions);

		const result = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(this.tables.assets)
			.where(allConditions!);

		return result[0]?.count || 0;
	}
}
