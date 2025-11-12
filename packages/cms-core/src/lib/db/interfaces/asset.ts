// Asset interface for asset operations
import type { Asset } from '../../types/index';
import type { Where, FindOptions, FindResult } from '../../types/filters';

export interface AssetFilters {
	organizationId: string; // Required for multi-tenancy (user's current org for RLS context)
	assetType?: 'image' | 'file';
	mimeType?: string;
	search?: string;
	limit?: number;
	offset?: number;
	filterOrganizationIds?: string[]; // Optional: Filter to specific org(s). RLS still enforces access.
}

export interface CreateAssetData {
	organizationId: string; // Required for multi-tenancy
	assetType: 'image' | 'file';
	filename: string;
	originalFilename: string;
	mimeType: string;
	size: number;
	url: string;
	path: string;
	storageAdapter: string; // Which storage adapter was used
	width?: number;
	height?: number;
	metadata?: any;
	title?: string;
	description?: string;
	alt?: string;
	creditLine?: string;
	createdBy?: string; // User ID (optional for backward compatibility)
}

export interface UpdateAssetData {
	url?: string; // Allow updating URL (for local storage after asset creation)
	title?: string;
	description?: string;
	alt?: string;
	creditLine?: string;
	updatedBy?: string; // User ID (optional for backward compatibility)
}

/**
 * Asset adapter interface for asset-specific operations
 */
export interface AssetAdapter {
	// Asset CRUD operations
	createAsset(data: CreateAssetData): Promise<Asset>;
	findAssetById(organizationId: string, id: string): Promise<Asset | null>;
	findAssets(
		organizationId: string,
		filters?: Omit<AssetFilters, 'organizationId'>
	): Promise<Asset[]>;
	updateAsset(organizationId: string, id: string, data: UpdateAssetData): Promise<Asset | null>;
	deleteAsset(organizationId: string, id: string): Promise<boolean>;

	// Asset analytics
	countAssets(organizationId: string): Promise<number>;
	countAssetsByType(organizationId: string): Promise<Record<string, number>>;
	getTotalAssetsSize(organizationId: string): Promise<number>;

	// Advanced filtering methods (for unified Local API)
	/**
	 * Find multiple assets with advanced filtering and pagination
	 * @param organizationId - Organization ID for multi-tenancy
	 * @param options - Advanced filter options (where, limit, offset, sort, etc.)
	 * @returns Paginated result with assets and metadata
	 */
	findManyAssetsAdvanced(
		organizationId: string,
		options?: FindOptions
	): Promise<FindResult<Asset>>;

	/**
	 * Find a single asset by ID
	 * @param organizationId - Organization ID for multi-tenancy
	 * @param id - Asset ID
	 * @returns Asset or null if not found
	 */
	findAssetByIdAdvanced(
		organizationId: string,
		id: string
	): Promise<Asset | null>;

	/**
	 * Count assets matching a where clause
	 * @param organizationId - Organization ID for multi-tenancy
	 * @param where - Filter conditions
	 * @returns Count of matching assets
	 */
	countAssetsAdvanced(organizationId: string, where?: Where): Promise<number>;
}
