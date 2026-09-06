// Asset interface for asset operations
import type { Asset, AssetMetadata } from '../../types/index';
import type { Where, FindOptions, FindResult } from '../../types/filters';

/**
 * Ordering for a page of assets.
 *
 * Deliberately a closed set of named orders rather than a `{ field, direction }`
 * pair: the sort has to be applied in SQL to be correct across pages, so every
 * value here is one an adapter must be able to express as an index-friendly
 * `ORDER BY`. An open column/direction pair would invite sorting on something
 * unindexed — or unsortable, like a JSON metadata key — with no way for the
 * adapter to say no.
 */
export type AssetSort = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

/**
 * Coarse media kinds, for the media browser's type filter.
 *
 * Deliberately not the same axis as `assetType` ('image' | 'file'), which records
 * whether the pipeline treated the upload as an image. This groups by what an
 * editor is looking for, so `svg` is its own bucket rather than an image: it is
 * the one the editor picks when hunting for a logo, and it behaves unlike a
 * raster image everywhere else too.
 */
export type AssetCategory = 'image' | 'svg' | 'video' | 'audio' | 'document';

export interface AssetFilters {
	assetType?: 'image' | 'file';
	mimeType?: string;
	/**
	 * Coarse media kind. Resolved against `mimeType` by the adapter, so a caller
	 * doesn't have to know that "document" means everything that isn't media.
	 */
	category?: AssetCategory;
	/**
	 * Free text. Matches the filename *and* the editable metadata (title, alt,
	 * description) — the distinction between a media library and a file browser is
	 * that alt text written for accessibility is also how you find the asset
	 * again. Case-insensitive on both dialects.
	 */
	search?: string;
	/**
	 * Whether the asset is referenced by any document.
	 *
	 * Answered from the asset-reference index, so it is an indexed `EXISTS` rather
	 * than a scan. It could not be offered before that index existed: references
	 * were resolved with `LIKE '%assetId%'` over every document's JSON, which
	 * makes a *filter* cost assets × documents.
	 *
	 * `'unused'` is the actionable one — it's how a library gets cleaned up — so
	 * it is worth being precise about what it means: no document references the
	 * asset in either its draft or its published data. An asset used only by an
	 * abandoned draft is therefore *in use*, which is the safe direction to err.
	 */
	usage?: 'in-use' | 'unused';
	includeSystem?: boolean;
	/**
	 * Widen the query from the caller's organization to that organization plus
	 * its children.
	 *
	 * A *request*, not a resolution: the caller doesn't know the hierarchy, so
	 * the adapter facade expands this into `filterOrganizationIds` before the
	 * asset adapter sees it. Ignored when hierarchy is disabled in config.
	 */
	includeChildOrganizations?: boolean;
	/**
	 * The explicit set of organizations to search, written by the facade.
	 *
	 * Callers outside an adapter should use `includeChildOrganizations` and let
	 * the facade resolve it; this exists so the resolution happens once per
	 * request rather than once per adapter method. Access is still enforced —
	 * under RLS by policy, and otherwise by the facade only ever putting the
	 * caller's own subtree in here.
	 */
	filterOrganizationIds?: string[];
	/** Defaults to `'newest'`. */
	sort?: AssetSort;
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
	assetType?: 'image' | 'file';
	mimeType?: string;
	size?: number;
	path?: string;
	/**
	 * Display filename. Renaming touches nothing in storage — the object lives at
	 * `{assetId}/original.{ext}`, which is derived from the id, not the name — but
	 * it does change `url`, whose trailing segment is cosmetically the filename.
	 * `AssetService.updateAssetMetadata` keeps the two in step; don't set this
	 * through an adapter directly.
	 */
	originalFilename?: string;
	/**
	 * Pixel dimensions. Writable because video's are only knowable in a browser —
	 * the upload path has no decoder for a video container, so they arrive later
	 * from the client that read the file. Images set these at upload and never
	 * update them.
	 */
	width?: number;
	height?: number;
	title?: string | null;
	description?: string | null;
	alt?: string | null;
	creditLine?: string | null;
	/**
	 * Replaces the whole metadata object — adapters write it as one JSON column,
	 * so there is no partial update. Callers must merge onto the current value
	 * rather than sending a fragment, or they silently drop whatever else the
	 * upload path recorded (dimensions, dominant colour, privacy fields).
	 */
	metadata?: AssetMetadata;
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
