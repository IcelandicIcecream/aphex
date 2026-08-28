// Asset interface for asset operations
import type { Asset } from '../../types/index';
import type { Where, FindOptions, FindResult } from '../../types/filters';

export interface AssetFilters {
	assetType?: 'image' | 'file';
	mimeType?: string;
	search?: string;
	includeSystem?: boolean;
	limit?: number;
	offset?: number;
}

export interface CreateAssetData {
	/**
	 * Explicit primary key. Omit to let the database generate one.
	 *
	 * Supplied by `AssetService.uploadAsset`, which needs the id *before* the
	 * row exists: the storage key is `{assetId}/original.{ext}`, so the file is
	 * written before the insert. Adapters must pass this through rather than
	 * relying on their column default.
	 */
	id?: string;
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

/**
 * Patch for an existing asset row.
 *
 * The editorial fields distinguish `undefined` from `null`, and adapters must
 * preserve that distinction: **`undefined` means "leave this column alone",
 * `null` means "clear it"**. Drizzle's `.set()` already drops undefined keys, so
 * the natural implementation is the correct one — but an adapter that coalesces
 * null to undefined (or filters falsy values) makes metadata addable and never
 * removable, which is exactly the bug this shape exists to prevent.
 */
export interface UpdateAssetData {
	url?: string; // Allow updating URL (for local storage after asset creation)
	/**
	 * Display filename. Renaming touches nothing in storage — the object lives at
	 * `{assetId}/original.{ext}`, which is derived from the id, not the name — but
	 * it does change `url`, whose trailing segment is cosmetically the filename.
	 * `AssetService.updateAssetMetadata` keeps the two in step; don't set this
	 * through an adapter directly.
	 */
	originalFilename?: string;
	title?: string | null;
	description?: string | null;
	alt?: string | null;
	creditLine?: string | null;
	updatedBy?: string; // User ID (optional for backward compatibility)
}

/**
 * Asset adapter interface for asset-specific operations
 */
export interface AssetAdapter {
	// Asset CRUD operations
	createAsset(data: CreateAssetData): Promise<Asset>;
	findAssetById(organizationId: string, id: string): Promise<Asset | null>;
	findAssets(organizationId: string, filters?: AssetFilters): Promise<Asset[]>;
	updateAsset(organizationId: string, id: string, data: UpdateAssetData): Promise<Asset | null>;
	deleteAsset(organizationId: string, id: string): Promise<boolean>;

	// Asset analytics
	countAssets(organizationId: string, filters?: AssetFilters): Promise<number>;
	countAssetsByType(organizationId: string): Promise<Record<string, number>>;
	getTotalAssetsSize(organizationId: string): Promise<number>;

	// Advanced filtering methods (for unified Local API)
	/**
	 * Find multiple assets with advanced filtering and pagination
	 * @param organizationId - Organization ID for multi-tenancy
	 * @param options - Advanced filter options (where, limit, offset, sort, etc.)
	 * @returns Paginated result with assets and metadata
	 */
	findManyAssetsAdvanced(organizationId: string, options?: FindOptions): Promise<FindResult<Asset>>;

	/**
	 * Find a single asset by ID
	 * @param organizationId - Organization ID for multi-tenancy
	 * @param id - Asset ID
	 * @returns Asset or null if not found
	 */
	findAssetByIdAdvanced(organizationId: string, id: string): Promise<Asset | null>;

	/**
	 * Count assets matching a where clause
	 * @param organizationId - Organization ID for multi-tenancy
	 * @param where - Filter conditions
	 * @returns Count of matching assets
	 */
	countAssetsAdvanced(organizationId: string, where?: Where): Promise<number>;
}
