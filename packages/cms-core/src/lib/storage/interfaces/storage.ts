// Pure storage interface for file operations only
export interface StorageFile {
	path: string;
	url: string;
	size: number;
}

export interface UploadFileData {
	buffer: Buffer;
	filename: string;
	mimeType: string;
	size: number;
}

export interface StorageConfig {
	basePath: string;
	baseUrl?: string;
	maxFileSize?: number;
	allowedTypes?: string[];
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
	 * Retrieve file contents as Buffer
	 * Useful for: image processing, transformations, backups, migrations
	 */
	getObject?(path: string): Promise<Buffer>;

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
