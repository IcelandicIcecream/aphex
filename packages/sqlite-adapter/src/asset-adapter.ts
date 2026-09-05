// SQLite asset adapter implementation
import { drizzle } from 'drizzle-orm/libsql';
import { eq, asc, desc, and, sql, inArray } from 'drizzle-orm';
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
 * SQLite asset adapter implementation
 * Handles all asset-related database operations
 */
export class SQLiteAssetAdapter implements AssetAdapter {
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
				// Undefined falls through to the column's default generator.
				...(data.id ? { id: data.id } : {}),
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

		return result[0]! as Asset;
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

			return (result[0] as Asset) || null;
		} catch {
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

			return (result[0] as Asset) || null;
		} catch {
			return null;
		}
	}

	/**
	 * `ORDER BY` for a named sort. Mirrors the Postgres adapter exactly — see the
	 * note there for why `id` is always the last key and why the name sorts fold
	 * case (SQLite's binary collation is the dialect that makes it necessary:
	 * without `lower()`, `Zebra` sorts before `apple`).
	 */
	private assetOrderBy(sort: NonNullable<AssetFilters['sort']>) {
		const { originalFilename, createdAt, id } = this.tables.assets;
		switch (sort) {
			case 'oldest':
				return [asc(createdAt), asc(id)];
			case 'name-asc':
				return [asc(sql`lower(${originalFilename})`), asc(id)];
			case 'name-desc':
				return [desc(sql`lower(${originalFilename})`), asc(id)];
			case 'newest':
			default:
				return [desc(createdAt), asc(id)];
		}
	}

	/**
	 * Every filter clause, shared by `findAssets` and `countAssets`.
	 *
	 * The two used to build their conditions separately, which is how a list and
	 * its own total quietly disagree: a filter added to one and missed in the other
	 * shows "1–20 of 300" over eleven rows. One builder means they cannot drift.
	 * Mirrors the PostgreSQL adapter clause for clause — the conformance suite runs
	 * these filters against both dialects.
	 */
	private buildAssetConditions(organizationId: string, filters: AssetFilters = {}) {
		const {
			assetType,
			mimeType,
			category,
			search,
			usage,
			includeSystem = false,
			filterOrganizationIds
		} = filters;
		const assets = this.tables.assets;

		// The facade resolves the org hierarchy and hands the whole subtree down;
		// absent that, an asset query is scoped to exactly one organization. Note
		// this replaces the single-org clause rather than adding to it — an `eq`
		// alongside an `inArray` would narrow straight back to the caller's org,
		// which is how `includeChildOrganizations` silently did nothing before.
		const conditions =
			filterOrganizationIds && filterOrganizationIds.length > 0
				? [inArray(assets.organizationId, filterOrganizationIds)]
				: [eq(assets.organizationId, organizationId)];

		if (assetType) conditions.push(eq(assets.assetType, assetType));
		if (mimeType) conditions.push(eq(assets.mimeType, mimeType));

		if (category) {
			// SVG is split out of `image/%` deliberately — see AssetCategory.
			switch (category) {
				case 'svg':
					conditions.push(eq(assets.mimeType, 'image/svg+xml'));
					break;
				case 'image':
					conditions.push(
						sql`${assets.mimeType} like 'image/%' and ${assets.mimeType} <> 'image/svg+xml'`
					);
					break;
				case 'video':
					conditions.push(sql`${assets.mimeType} like 'video/%'`);
					break;
				case 'audio':
					conditions.push(sql`${assets.mimeType} like 'audio/%'`);
					break;
				case 'document':
					conditions.push(
						sql`${assets.mimeType} not like 'image/%' and ${assets.mimeType} not like 'video/%' and ${assets.mimeType} not like 'audio/%'`
					);
					break;
			}
		}

		if (search) {
			// Explicitly case-folded rather than relying on SQLite's LIKE, which is
			// case-insensitive for ASCII only — and case-sensitive in Postgres. The
			// bare LIKE this replaced therefore answered differently per dialect.
			const pattern = `%${search.toLowerCase()}%`;
			conditions.push(
				sql`(lower(${assets.originalFilename}) like ${pattern}
					or lower(coalesce(${assets.title}, '')) like ${pattern}
					or lower(coalesce(${assets.alt}, '')) like ${pattern}
					or lower(coalesce(${assets.description}, '')) like ${pattern})`
			);
		}

		if (usage) {
			// Indexed EXISTS against the reference index — the whole reason that
			// index exists. Expressed against `cms_asset_references` directly rather
			// than through a join so the shape stays a plain WHERE and composes with
			// every other filter.
			const referenced = sql`exists (select 1 from cms_asset_references r where r.asset_id = ${assets.id} and r.organization_id = ${assets.organizationId})`;
			conditions.push(usage === 'in-use' ? referenced : sql`not ${referenced}`);
		}

		if (!includeSystem) {
			conditions.push(sql`coalesce(json_extract(${assets.metadata}, '$.system'), 0) <> 1`);
		}

		return conditions;
	}

	/**
	 * Find multiple assets with filtering
	 */
	async findAssets(organizationId: string, filters: AssetFilters = {}): Promise<Asset[]> {
		try {
			const { sort = 'newest', limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET } = filters;

			const conditions = this.buildAssetConditions(organizationId, filters);

			// Build and execute query
			const result = await this.db
				.select()
				.from(this.tables.assets)
				.where(and(...conditions))
				.orderBy(...this.assetOrderBy(sort))
				.limit(limit)
				.offset(offset);

			return result as Asset[];
		} catch {
			return [];
		}
	}

	/**
	 * Find asset by ID without an organization filter (public asset serving).
	 * Plain query — SQLite has no RLS to bypass, the global scope is the point.
	 */
	async findAssetByIdGlobal(id: string): Promise<Asset | null> {
		try {
			const result = await this.db
				.select()
				.from(this.tables.assets)
				.where(eq(this.tables.assets.id, id))
				.limit(1);

			return (result[0] as Asset) || null;
		} catch {
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

			return (result[0] as Asset) || null;
		} catch {
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
		} catch {
			return false;
		}
	}

	/**
	 * Count total assets
	 */
	async countAssets(organizationId: string, filters?: AssetFilters): Promise<number> {
		try {
			const conditions = this.buildAssetConditions(organizationId, filters);

			const result = await this.db
				.select({ count: sql<number>`count(*)` })
				.from(this.tables.assets)
				.where(and(...conditions));

			return result[0]?.count || 0;
		} catch {
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
		} catch {
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
		} catch {
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

		// Parse where clause (assets don't have JSON data like documents)
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
			query = query.orderBy(desc(this.tables.assets.createdAt), this.tables.assets.id) as any;
		}

		// Apply pagination
		const docs = await query.limit(limit).offset(offset);

		// Calculate pagination metadata
		const totalPages = Math.ceil(totalDocs / limit);
		const currentPage = Math.floor(offset / limit) + 1;

		return {
			docs: docs as Asset[],
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

		return (result[0] as Asset) || null;
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
