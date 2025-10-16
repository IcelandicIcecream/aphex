// Asset service - orchestrates storage and database operations
import sharp from 'sharp';
import type { StorageAdapter } from '../storage/interfaces/storage.js';
import type { DatabaseAdapter } from '../db/interfaces/index.js';
import type { Asset } from '../types/index.js';

export interface AssetUploadData {
	buffer: Buffer;
	originalFilename: string;
	mimeType: string;
	size: number;
	title?: string;
	description?: string;
	alt?: string;
	creditLine?: string;
}

export interface AssetFilters {
	assetType?: 'image' | 'file';
	mimeType?: string;
	search?: string;
	limit?: number;
	offset?: number;
}

/**
 * Asset service - coordinates storage and database operations
 * Maintains separation of concerns while providing unified asset management
 */
export class AssetService {
	constructor(
		private storage: StorageAdapter,
		private database: DatabaseAdapter
	) {}

	/**
	 * Upload and store an asset
	 */
	async uploadAsset(organizationId: string, data: AssetUploadData): Promise<Asset> {
		// Determine asset type
		const assetType = data.mimeType.startsWith('image/') ? 'image' : 'file';

		// Extract image metadata if it's an image
		let width: number | undefined;
		let height: number | undefined;
		let metadata: any = {};

		if (assetType === 'image') {
			try {
				const imageMetadata = await sharp(data.buffer).metadata();
				width = imageMetadata.width;
				height = imageMetadata.height;

				// Extract additional metadata
				const stats = await sharp(data.buffer).stats();
				metadata = {
					format: imageMetadata.format,
					space: imageMetadata.space,
					channels: imageMetadata.channels,
					density: imageMetadata.density,
					hasProfile: imageMetadata.hasProfile,
					hasAlpha: imageMetadata.hasAlpha,
					dominantColor: stats.dominant
				};
			} catch (error) {
				console.warn('Could not extract image metadata:', error);
			}
		}

		// 1. Store file using storage adapter
		const storageFile = await this.storage.store({
			buffer: data.buffer,
			filename: data.originalFilename,
			mimeType: data.mimeType,
			size: data.size
		});

		// 2. Save asset metadata using database adapter
		try {
			const asset = await this.database.createAsset({
				assetType,
				filename: storageFile.path.split('/').pop() || data.originalFilename,
				originalFilename: data.originalFilename,
				mimeType: data.mimeType,
				size: data.size,
				url: storageFile.url,
				path: storageFile.path,
				storageAdapter: this.storage.name, // Track which adapter stored this file
				organizationId,
				width,
				height,
				metadata,
				title: data.title || undefined,
				description: data.description || undefined,
				alt: data.alt || undefined,
				creditLine: data.creditLine || undefined
			});

			return asset;
		} catch (error) {
			// If database save fails, clean up the stored file
			await this.storage.delete(storageFile.path);
			throw error;
		}
	}

	/**
	 * Find asset by ID
	 */
	async findAssetById(organizationId: string, id: string): Promise<Asset | null> {
		return await this.database.findAssetById(organizationId, id);
	}

	/**
	 * Find multiple assets with filtering
	 */
	async findAssets(organizationId: string, filters: AssetFilters = {}): Promise<Asset[]> {
		return await this.database.findAssets(organizationId, filters);
	}

	/**
	 * Delete asset (both file and database record)
	 *
	 * Note: If the asset was stored by a different adapter (e.g., switching from R2 to local),
	 * file deletion may fail. The database record will still be removed for a clean state.
	 */
	async deleteAsset(organizationId: string, id: string): Promise<boolean> {
		const asset = await this.database.findAssetById(organizationId, id);
		if (!asset) {
			return false;
		}

		// Try to delete file from storage
		// If the asset was stored by a different adapter, this may fail
		if (asset.storageAdapter === this.storage.name) {
			// Same adapter - delete should work
			try {
				await this.storage.delete(asset.path);
			} catch (error) {
				console.warn(`Failed to delete file from storage: ${asset.path}`, error);
			}
		} else {
			// Different adapter - log warning but continue with database cleanup
			console.warn(
				`Asset ${id} was stored by '${asset.storageAdapter}' but current adapter is '${this.storage.name}'. ` +
					`File at ${asset.path} may need manual cleanup.`
			);
		}

		// Always delete database record for clean state
		return await this.database.deleteAsset(organizationId, id);
	}

	/**
	 * Update asset metadata
	 */
	async updateAssetMetadata(
		organizationId: string,
		id: string,
		metadata: {
			title?: string;
			description?: string;
			alt?: string;
			creditLine?: string;
		}
	): Promise<Asset | null> {
		return await this.database.updateAsset(organizationId, id, metadata);
	}

	/**
	 * Get asset statistics
	 */
	async getAssetStats(organizationId: string): Promise<{
		totalAssets: number;
		totalImages: number;
		totalFiles: number;
		totalSize: number;
	}> {
		const [totalAssets, assetsByType, totalSize] = await Promise.all([
			this.database.countAssets(organizationId),
			this.database.countAssetsByType(organizationId),
			this.database.getTotalAssetsSize(organizationId)
		]);

		return {
			totalAssets,
			totalImages: assetsByType.image || 0,
			totalFiles: assetsByType.file || 0,
			totalSize
		};
	}

	/**
	 * Get health status of both storage and database
	 */
	async getHealthStatus(): Promise<{
		storage: boolean;
		database: boolean;
	}> {
		const [storageHealthy, databaseHealthy] = await Promise.all([
			this.storage.isHealthy(),
			this.database.isHealthy()
		]);

		return {
			storage: storageHealthy,
			database: databaseHealthy
		};
	}
}
