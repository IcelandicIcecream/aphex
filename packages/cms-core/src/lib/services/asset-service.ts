// Asset service - orchestrates storage and database operations
import sharp from 'sharp';
import type { StorageAdapter } from '../storage/interfaces/storage';
import type { DatabaseAdapter } from '../db/interfaces/index';
import type { UpdateAssetData } from '../db/interfaces/asset';
import type { Asset } from '../types/index';
import { cmsLogger } from '../utils/logger';
import { collectAssetRefs, injectAssetData, type ResolvedAsset } from '../preview/assets';
import { buildAssetUrl, buildOriginalKey } from '../storage/keys';

/**
 * Maximum asset ids per `IN (...)` when resolving refs for injection.
 *
 * Bounded rather than unbounded because SQLite caps bound parameters per
 * statement (999 on older builds), so a page holding enough images would turn a
 * working-but-slow render into a hard query error. Typical pages fit in a single
 * batch; only unusually image-dense ones pay for a second round trip.
 */
const ASSET_LOOKUP_CHUNK_SIZE = 200;

function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
	return out;
}

export interface AssetUploadData {
	buffer: Buffer;
	originalFilename: string;
	mimeType: string;
	size: number;
	title?: string;
	description?: string;
	// Default alt text for the asset — shared across every placement. A per-placement
	// override can be set on the image field value (ImageValue.alt); render precedence
	// is `value.alt || asset.alt`.
	alt?: string;
	creditLine?: string;
	createdBy?: string; // User ID who uploaded this asset
	metadata?: {
		schemaType?: string; // e.g., 'newsletterLanding'
		fieldPath?: string; // e.g., 'logo' or 'seo.metaImage'
		[key: string]: any; // Allow additional metadata
	};
}

export interface AssetFilters {
	assetType?: 'image' | 'file';
	mimeType?: string;
	search?: string;
	includeSystem?: boolean;
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
		let metadata: any = {
			// Include field metadata for privacy checking
			...data.metadata
		};

		if (assetType === 'image') {
			try {
				const imageMetadata = await sharp(data.buffer, {
					limitInputPixels: 100_000_000
				}).metadata();
				width = imageMetadata.width;
				height = imageMetadata.height;

				// Merge image metadata with field metadata
				metadata = {
					...metadata, // Keep schemaType and fieldPath
					format: imageMetadata.format,
					space: imageMetadata.space,
					channels: imageMetadata.channels,
					density: imageMetadata.density,
					hasProfile: imageMetadata.hasProfile,
					hasAlpha: imageMetadata.hasAlpha
				};

				// Add dominant color
				const stats = await sharp(data.buffer, { limitInputPixels: 100_000_000 }).stats();
				metadata.dominantColor = stats.dominant;
			} catch (error) {
				cmsLogger.warn('Could not extract image metadata:', error);
			}
		}

		// The id is generated here rather than by the database, because the
		// storage key is derived from it and the file is written before the row
		// exists. That inversion is the point of the whole layout: `asset.path`
		// becomes predictable from the asset id, so a resized variant can be
		// written next to the original without reading the row back first.
		const assetId = crypto.randomUUID();

		// 1. Store file using storage adapter
		const storageFile = await this.storage.store({
			buffer: data.buffer,
			filename: data.originalFilename,
			mimeType: data.mimeType,
			size: data.size,
			key: buildOriginalKey(assetId, data.originalFilename, data.mimeType)
		});

		// 2. Save asset metadata using database adapter
		try {
			const asset = await this.database.createAsset({
				id: assetId,
				assetType,
				// The stored key's basename, not the user's filename — `filename` is
				// the on-disk name and `originalFilename` is what the user uploaded.
				filename: storageFile.key.split('/').pop() || data.originalFilename,
				originalFilename: data.originalFilename,
				mimeType: data.mimeType,
				size: data.size,
				// Point every asset at the CDN route, whatever adapter stored it.
				//
				// S3/R2 uploads used to keep the bucket's own public URL here, which
				// is what made `/media/:id/:filename` redirect to it — the route's
				// privacy checks were decorative for remote storage, and a private
				// bucket couldn't serve at all. Routing through the app is what gives
				// those checks something to enforce; `signedDownloads` is the way back
				// out for files that shouldn't be proxied.
				//
				// Assets uploaded before this keep their stored absolute URL and keep
				// working exactly as they did — a lazy migration, not a rewrite. Those
				// rows stay publicly reachable until they're re-uploaded.
				url: buildAssetUrl(assetId, data.originalFilename),
				path: storageFile.path,
				storageAdapter: this.storage.name,
				organizationId,
				width,
				height,
				metadata,
				title: data.title || undefined,
				description: data.description || undefined,
				alt: data.alt || undefined,
				creditLine: data.creditLine || undefined,
				createdBy: data.createdBy
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
	 * Hydrate one or more documents in place so their images are renderable: every
	 * `{ asset: { _ref } }` reachable in the docs gets its `url` (and default `alt`)
	 * injected. This is what a public route's `load` calls before returning a document —
	 * the frontend then reads `image.asset.url` directly, with no side-channel map. The
	 * live editor preview performs the identical injection client-side, so SSR and preview
	 * documents share one shape.
	 *
	 * Mutates the passed documents (they're request-scoped query results). Refs are
	 * resolved once and de-duped across all docs in a single batch.
	 */
	async injectAssetUrls(organizationId: string, ...docs: unknown[]): Promise<void> {
		const refs = new Set<string>();
		for (const doc of docs) collectAssetRefs(doc, refs);
		if (refs.size === 0) return;

		const ids = [...refs];
		const resolved = new Map<string, ResolvedAsset>();

		try {
			// One query per batch of refs, not one per ref. This runs on every public
			// page render, so an N+1 here is N round trips to a database that, on a
			// serverless deployment, is both remote and reached through a small
			// connection pool — the requests don't even run concurrently, they queue.
			//
			// `limit` is explicit and sized to the batch because the adapter's default
			// is 20. Relying on that default would silently drop refs from any page
			// carrying more images than the limit: no error anywhere, just blank
			// images on the pages with the most of them.
			await Promise.all(
				chunk(ids, ASSET_LOOKUP_CHUNK_SIZE).map(async (batch) => {
					const result = await this.database.findManyAssetsAdvanced(organizationId, {
						where: { id: { in: batch } },
						limit: batch.length
					});
					for (const asset of result.docs) {
						if (asset.url) resolved.set(asset.id, { url: asset.url, alt: asset.alt ?? undefined });
					}
				})
			);
		} catch (error) {
			// Unchanged posture: unresolved refs leave their images unrendered rather
			// than failing the whole page load. The blast radius is wider than the
			// per-asset version (one failure now loses every ref), but a failing
			// batched query means the database is unreachable, in which case the
			// per-asset version would have failed on every ref anyway.
			cmsLogger.warn('[AssetService] Could not resolve asset URLs for injection:', error);
		}

		for (const doc of docs) injectAssetData(doc, resolved);
	}

	/**
	 * Find asset by ID globally (bypasses organization filter for public asset access)
	 * Only available on PostgreSQL adapter with RLS bypass
	 */
	async findAssetByIdGlobal(id: string): Promise<Asset | null> {
		// Check if the adapter has the global method
		if (
			'findAssetByIdGlobal' in this.database &&
			typeof this.database.findAssetByIdGlobal === 'function'
		) {
			cmsLogger.debug('[AssetService] Using findAssetByIdGlobal from adapter');
			return await this.database.findAssetByIdGlobal(id);
		}
		// Fallback: not supported
		cmsLogger.warn('[AssetService] findAssetByIdGlobal not supported by this database adapter');
		cmsLogger.warn('[AssetService] Database adapter type:', this.database.constructor.name);
		cmsLogger.warn(
			'[AssetService] Available methods:',
			Object.getOwnPropertyNames(Object.getPrototypeOf(this.database))
		);
		return null;
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
				cmsLogger.warn(`Failed to delete file from storage: ${asset.path}`, error);
			}
		} else {
			// Different adapter - log warning but continue with database cleanup
			cmsLogger.warn(
				`Asset ${id} was stored by '${asset.storageAdapter}' but current adapter is '${this.storage.name}'. ` +
					`File at ${asset.path} may need manual cleanup.`
			);
		}

		// Always delete database record for clean state
		return await this.database.deleteAsset(organizationId, id);
	}

	/**
	 * Update asset metadata, including renaming it.
	 *
	 * `undefined` leaves a field untouched; `null` clears it. See
	 * {@link UpdateAssetData}.
	 *
	 * Renaming is metadata-only. The stored object lives at
	 * `{assetId}/original.{ext}`, derived from the id rather than the name, so
	 * nothing moves in storage and existing `_ref`s keep resolving — the only
	 * thing that changes is the cosmetic trailing segment of `url`, which this
	 * method regenerates so the two can't drift.
	 *
	 * Assets stored under the old flat layout are renamed the same way: their
	 * `path` still points at the original file, and only the display name and
	 * URL move. The exception is a pre-`/media/` asset still carrying an absolute
	 * bucket URL — that URL isn't ours to rewrite, so it's left alone.
	 */
	async updateAssetMetadata(
		organizationId: string,
		id: string,
		metadata: {
			originalFilename?: string;
			title?: string | null;
			description?: string | null;
			alt?: string | null;
			creditLine?: string | null;
			updatedBy?: string; // User ID who updated this asset
		}
	): Promise<Asset | null> {
		const patch: UpdateAssetData = { ...metadata };

		if (metadata.originalFilename !== undefined) {
			const existing = await this.database.findAssetById(organizationId, id);
			if (!existing) return null;
			// Leave an absolute URL alone — it addresses the bucket directly and
			// carries no filename segment of ours to keep in step.
			if (!existing.url || existing.url.startsWith('/media/')) {
				patch.url = buildAssetUrl(id, metadata.originalFilename);
			}
		}

		return await this.database.updateAsset(organizationId, id, patch);
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
