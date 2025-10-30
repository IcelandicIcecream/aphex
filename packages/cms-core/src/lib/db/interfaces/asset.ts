// Asset interface for asset operations
import type { Asset } from '../../types/index';

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
}
