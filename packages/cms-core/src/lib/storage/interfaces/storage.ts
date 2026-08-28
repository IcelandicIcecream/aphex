// Pure storage interface for file operations only
export interface StorageFile {
	/**
	 * Adapter-relative key: what the caller asked to be stored, or what the
	 * adapter chose. Deliberately distinct from `path`.
	 *
	 * `path` is whatever the adapter needs to address the object again, and its
	 * shape is adapter-private — an absolute filesystem path locally, a
	 * `bucket/...` string on S3. `key` is the portable half, relative to the
	 * adapter's own root (`basePath` locally, the bucket on S3), which is what
	 * makes it possible to derive a sibling key — the variant next to an
	 * original — without knowing how a given adapter addresses storage.
	 */
	key: string;
	path: string;
	url: string;
	size: number;
}

export interface UploadFileData {
	buffer: Buffer;
	filename: string;
	mimeType: string;
	size: number;
	/**
	 * Store at exactly this adapter-relative key, instead of letting the adapter
	 * invent one from `filename`.
	 *
	 * Without it every adapter derives its own name (the local one appends
	 * ` (1)` on collision, S3 appends a timestamp and a random suffix), so
	 * `asset.path` can't be predicted from the asset id and there's no way to
	 * write a second file — a resized variant — beside the original.
	 *
	 * The caller owns uniqueness when it passes a key: an adapter given one
	 * writes there, overwriting whatever was at that key.
	 */
	key?: string;
}

export interface StorageConfig {
	basePath: string;
	baseUrl?: string;
	maxFileSize?: number;
	options?: {
		[key: string]: any;
	};
}

export interface StorageObjectMetadata {
	key: string;
	size: number;
	lastModified: Date;
	contentType?: string;
	etag?: string;
}

export interface ListObjectsOptions {
	prefix?: string;
	maxKeys?: number;
	continuationToken?: string;
}

export interface ListObjectsResult {
	objects: StorageObjectMetadata[];
	isTruncated: boolean;
	continuationToken?: string;
}

/**
 * Pure storage interface - only handles file operations
 * No database operations - completely agnostic
 */
export interface StorageAdapter {
	// Adapter identifier (used to track which adapter stored each file)
	readonly name: string;

	// Core file operations (required)
	store(data: UploadFileData): Promise<StorageFile>;
	delete(path: string): Promise<boolean>;
	exists(path: string): Promise<boolean>;
	getUrl(path: string): string;

	/**
	 * Retrieve file contents as a Buffer.
	 *
	 * **Required.** `/media/:id/:filename` proxies every asset through this by
	 * default, which is what makes its access checks real — the previous
	 * behaviour redirected straight to the bucket's public URL, so the checks
	 * decided nothing and a private bucket simply broke. An adapter that can't
	 * read its own objects back can't serve them.
	 *
	 * Also used by image processing, backups, and migrations.
	 */
	getObject(path: string): Promise<Buffer>;

	// Storage info
	getStorageInfo(): Promise<{
		totalSize: number;
		availableSpace?: number;
	}>;

	// Health check
	isHealthy(): Promise<boolean>;

	// Connection management (optional)
	connect?(): Promise<void>;
	disconnect?(): Promise<void>;

	// Extended file operations (optional - for advanced storage features)

	/**
	 * List objects in storage with optional filtering
	 * Useful for: admin UI file browser, asset management, cleanup operations
	 */
	listObjects?(options?: ListObjectsOptions): Promise<ListObjectsResult>;

	/**
	 * Copy/duplicate an object within storage
	 * Useful for: versioning, backups, image variant generation
	 */
	copyObject?(sourcePath: string, destPath: string): Promise<boolean>;

	/**
	 * Get object metadata without downloading the file
	 * Useful for: verifying file integrity, checking size/type
	 */
	getObjectMetadata?(path: string): Promise<StorageObjectMetadata>;

	/**
	 * Generate a signed URL for temporary access to a file
	 * Useful for: access control, private files, secure downloads
	 * @param path - File path
	 * @param expiresIn - Expiration time in seconds (default: 3600)
	 * @returns Signed URL that expires after the specified time
	 */
	getSignedUrl?(path: string, expiresIn?: number): Promise<string>;
}

/**
 * Storage provider factory interface
 */
export interface StorageProvider {
	name: string;
	createAdapter(config: StorageConfig): StorageAdapter;
}
