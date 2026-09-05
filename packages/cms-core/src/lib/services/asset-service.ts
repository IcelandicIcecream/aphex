// Asset service - orchestrates storage and database operations
import sharp from 'sharp';
import type { StorageAdapter } from '../storage/interfaces/storage';
import type { DatabaseAdapter } from '../db/interfaces/index';
import type { AssetFilters, UpdateAssetData } from '../db/interfaces/asset';
import type { Asset, AssetMetadata } from '../types/index';
import { cmsLogger } from '../utils/logger';
import { collectAssetRefs, injectAssetData, type ResolvedAsset } from '../preview/assets';
import { buildAssetUrl, buildOriginalKey } from '../storage/keys';
import {
	buildSrcset,
	canGenerateVariants,
	configHashFor,
	getVariants,
	type ImageConfig
} from '../images/variants';

/**
 * Maximum asset ids per `IN (...)` when resolving refs for injection.
 *
 * Bounded rather than unbounded because SQLite caps bound parameters per
 * statement (999 on older builds), so a page holding enough images would turn a
 * working-but-slow render into a hard query error. Typical pages fit in a single
 * batch; only unusually image-dense ones pay for a second round trip.
 */
const ASSET_LOOKUP_CHUNK_SIZE = 200;

/**
 * Largest direct upload read back through the app to extract image metadata.
 *
 * The direct path exists precisely so bytes don't flow through the function, so
 * pulling them back is self-defeating past a point. Images get inspected because
 * dimensions drive the responsive ladder; anything larger is trusted as-is.
 */
const DIRECT_UPLOAD_INSPECT_MAX_BYTES = 25 * 1024 * 1024;

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
	/**
	 * Pixel dimensions supplied by the caller. Used only where this service cannot
	 * derive them itself — video, whose container it has no decoder for. Ignored
	 * for images, which are measured from the buffer.
	 */
	width?: number;
	height?: number;
	metadata?: {
		schemaType?: string; // e.g., 'newsletterLanding'
		fieldPath?: string; // e.g., 'logo' or 'seo.metaImage'
		[key: string]: any; // Allow additional metadata
	};
}

/**
 * Re-exported from the database port rather than declared again.
 *
 * There were two of these — this one and `AssetFilters` in
 * `db/interfaces/asset.ts` — with identical fields and no relationship. The
 * `/server` barrel exports *this* name, so it's the one every adapter imports,
 * while the port is what `findAssets` is actually typed against. Adding `sort`
 * to the port therefore compiled cleanly in core and failed in both adapters,
 * which is the mild version: the bad version is a field added to one copy and
 * silently dropped by every implementation typed against the other.
 */
export type { AssetFilters } from '../db/interfaces/asset';

/**
 * Asset service - coordinates storage and database operations
 * Maintains separation of concerns while providing unified asset management
 */
export class AssetService {
	/**
	 * `images` is optional so existing callers (and tests) keep working: without
	 * it, injection produces `url`/`alt` exactly as before and `<Image>` falls
	 * back to a plain `src`. The srcset is built here rather than in the
	 * component because this is where the config lives — see
	 * {@link ResolvedAsset.srcset}.
	 */
	constructor(
		private storage: StorageAdapter,
		private database: DatabaseAdapter,
		private images: ImageConfig | null = null
	) {}

	/**
	 * Upload and store an asset
	 */
	async uploadAsset(organizationId: string, data: AssetUploadData): Promise<Asset> {
		// Determine asset type
		const assetType = data.mimeType.startsWith('image/') ? 'image' : 'file';

		// Extract image metadata if it's an image
		// Seeded from the caller for video: sharp can read an image's dimensions from
		// the buffer below, but nothing here can demux a video container, so the
		// browser's reading at upload time is the only source. Overwritten for
		// images, which have an authoritative answer a line later.
		let width: number | undefined = data.width;
		let height: number | undefined = data.height;
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
					// Frame count. 1 (or absent) for a still image; >1 for an
					// animated GIF/WebP. Recorded so the srcset builder can skip
					// animated sources without re-reading the file — resizing one
					// would silently flatten it to a single frame.
					pages: imageMetadata.pages ?? 1,
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
	 * Create the asset row for a file the browser uploaded straight to storage.
	 *
	 * The ordering is inverted from {@link uploadAsset}: there, the file is
	 * written and the row rolled back if the insert fails. Here the client wrote
	 * the object independently, so the object can exist with no row — an orphan.
	 * That is the accepted trade, because the alternative on a serverless host is
	 * that large files cannot be uploaded at all.
	 *
	 * Nothing the client says about the object is trusted. Its existence and
	 * size are read back from storage, because a caller could otherwise claim a
	 * 1KB upload, never perform it, or exceed the configured ceiling — the
	 * signed URL bypasses `bodyLimit` entirely, so this is the only place the
	 * limit can still be enforced.
	 */
	async finalizeDirectUpload(
		organizationId: string,
		intent: {
			assetId: string;
			key: string;
			originalFilename: string;
			mimeType: string;
			schemaType?: string;
			fieldPath?: string;
		},
		extras: {
			maxBytes: number;
			title?: string;
			description?: string;
			alt?: string;
			creditLine?: string;
			createdBy?: string;
			/**
			 * Privacy resolved from the target field by the caller, which has the
			 * schema this service does not. Stamped onto the asset so the answer
			 * survives that field being renamed — see `utils/asset-privacy.ts`.
			 */
			private?: boolean;
		}
	): Promise<Asset> {
		if (!this.storage.resolvePath) {
			throw new Error('Storage adapter cannot resolve a path for a direct upload');
		}
		const path = this.storage.resolvePath(intent.key);

		// Verified, not reported. A client that skipped the PUT would otherwise
		// leave a row pointing at nothing, which renders as a permanently broken
		// image with no indication why.
		const size = await this.verifyUploadedObject(path, extras.maxBytes);

		const assetType = intent.mimeType.startsWith('image/') ? 'image' : 'file';
		let width: number | undefined;
		let height: number | undefined;
		let metadata: AssetMetadata = {
			...(intent.schemaType ? { schemaType: intent.schemaType } : {}),
			...(intent.fieldPath ? { fieldPath: intent.fieldPath } : {}),
			...(extras.private !== undefined ? { private: extras.private } : {})
		};

		if (assetType === 'image' && size <= DIRECT_UPLOAD_INSPECT_MAX_BYTES) {
			// Reading the object back costs a download the direct path exists to
			// avoid, so it is done only for images and only up to a bound. Without
			// dimensions the srcset can't drop rungs above the original, which
			// makes for wasteful markup — bad, but not broken. Pulling a 200MB
			// video back through the function to learn nothing would be worse.
			try {
				const buffer = await this.storage.getObject(path);
				const imageMetadata = await sharp(buffer, { limitInputPixels: 100_000_000 }).metadata();
				width = imageMetadata.width;
				height = imageMetadata.height;
				metadata = {
					...metadata,
					pages: imageMetadata.pages ?? 1,
					format: imageMetadata.format,
					space: imageMetadata.space,
					channels: imageMetadata.channels,
					hasAlpha: imageMetadata.hasAlpha
				};
			} catch (error) {
				cmsLogger.warn('[AssetService] Could not inspect direct upload:', error);
			}
		}

		return await this.database.createAsset({
			id: intent.assetId,
			assetType,
			filename: intent.key.split('/').pop() || intent.originalFilename,
			originalFilename: intent.originalFilename,
			mimeType: intent.mimeType,
			size,
			url: buildAssetUrl(intent.assetId, intent.originalFilename),
			path,
			storageAdapter: this.storage.name,
			organizationId,
			width,
			height,
			metadata,
			title: extras.title || undefined,
			description: extras.description || undefined,
			alt: extras.alt || undefined,
			creditLine: extras.creditLine || undefined,
			createdBy: extras.createdBy
		});
	}

	/**
	 * Confirm the object is really there and within the ceiling, returning its
	 * true size. Deletes and rejects an oversized upload.
	 */
	private async verifyUploadedObject(path: string, maxBytes: number): Promise<number> {
		if (!this.storage.getObjectMetadata) {
			throw new Error('Storage adapter cannot verify a direct upload');
		}

		let size: number;
		try {
			size = (await this.storage.getObjectMetadata(path)).size;
		} catch {
			throw new Error('Upload not found in storage');
		}

		if (size <= 0) throw new Error('Upload not found in storage');

		if (size > maxBytes) {
			// A presigned PUT can't enforce a size limit at write time, so the
			// ceiling is enforced here — after the bytes were spent, but before
			// they become a permanent asset. Removing the object keeps a rejected
			// upload from silently occupying the bucket forever.
			try {
				await this.storage.delete(path);
			} catch (error) {
				cmsLogger.warn('[AssetService] Could not remove oversized direct upload:', error);
			}
			throw new Error(`Upload exceeds the ${Math.floor(maxBytes / (1024 * 1024))}MB limit`);
		}

		return size;
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
						if (!asset.url) continue;
						resolved.set(asset.id, {
							url: asset.url,
							alt: asset.alt ?? undefined,
							width: asset.width ?? undefined,
							height: asset.height ?? undefined,
							srcset: this.buildSrcsetFor(asset)
						});
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
	 * Responsive `srcset` for an image, or undefined when there's nothing to offer.
	 *
	 * Non-images and SVGs are excluded: an SVG is already resolution-independent,
	 * and rasterising one to a fixed ladder makes it strictly worse.
	 */
	private buildSrcsetFor(asset: Asset): string | undefined {
		if (!this.images) return undefined;
		// Shared with the admin client's thumbnail picker — see `canGenerateVariants`.
		// Offering a srcset for an ineligible asset would point every rung at a URL
		// that falls back to the original anyway, which is just the same file listed
		// five times with five different width claims.
		if (!canGenerateVariants(asset)) return undefined;
		return buildSrcset(asset.id, this.images, configHashFor(this.images), asset.width);
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
			await this.deleteAssetObjects(asset);
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
	 * Remove an asset's original *and every derivative generated from it*.
	 *
	 * Deleting only `asset.path` leaks: each generated variant is a separate
	 * object, and nothing else ever refers to it again. The leak is invisible —
	 * no error, no broken image, just a bucket that grows and never shrinks.
	 *
	 * Two sources, unioned, because neither is sufficient alone:
	 *
	 * - **Prefix listing** is authoritative. Every derivative is a sibling of the
	 *   original under `{assetId}/`, so one listing finds all of them —
	 *   *including* ones generated under a config that has since changed, which
	 *   the database has no record of at all (`recordVariant` replaces the record
	 *   wholesale when the config hash moves). But `listObjects` is optional on
	 *   the port, and the local adapter doesn't implement it.
	 * - **The recorded variants** cover that gap, and cost nothing to read.
	 *
	 * Only assets stored under the id-directory layout get the prefix treatment.
	 * An older flat-layout asset has a path unrelated to its id, so deriving a
	 * prefix from the id would either match nothing or — much worse — match
	 * something else.
	 */
	private async deleteAssetObjects(asset: Asset): Promise<void> {
		const paths = new Set<string>([asset.path]);

		for (const variant of getVariants(asset)?.widths ?? []) {
			paths.add(variant.path);
		}

		// `listObjects` scopes the prefix to the adapter's own basePath, so this
		// is the storage *key* prefix, not the resolved path.
		if (this.storage.listObjects && asset.path.includes(`${asset.id}/`)) {
			try {
				const { objects } = await this.storage.listObjects({ prefix: `${asset.id}/` });
				// The field is named `key` but adapters return a resolved path, which
				// is what `delete` takes.
				for (const object of objects) paths.add(object.key);
			} catch (error) {
				// A failed listing costs orphaned derivatives, not a failed delete.
				// The original and the recorded variants still go.
				cmsLogger.warn(
					`[AssetService] Could not list derivatives of ${asset.id}; some may be orphaned`,
					error
				);
			}
		}

		const targets = [...paths];
		const results = await Promise.allSettled(targets.map((path) => this.storage.delete(path)));
		results.forEach((result, i) => {
			if (result.status === 'rejected') {
				cmsLogger.warn(`Failed to delete file from storage: ${targets[i]}`, result.reason);
			}
		});
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
