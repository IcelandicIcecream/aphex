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
	/**
	 * Standalone default only. Inside a CMS this is overwritten at config time by
	 * `upload.maxFileSize` (see {@link StorageAdapter.setMaxFileSize}) so the limit
	 * has a single home; set it here only when using the adapter on its own.
	 */
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
	 * Adopt the app's configured upload ceiling.
	 *
	 * Called once by `createCMSConfig` with the value `upload.maxFileSize`
	 * resolves to, so there is exactly one number to set. An adapter's own
	 * `maxFileSize` is only a standalone default for use outside a CMS config —
	 * when both existed independently, the reference app set `upload.maxFileSize`
	 * to 100MB and left the S3 adapter on its 10MB default, so anything between
	 * the two passed the request-body check and then died inside the adapter with
	 * "File too large" instead of a clean 413.
	 *
	 * Adapters still enforce it: `bodyLimit` only guards HTTP, and the Local API,
	 * MCP `upload_asset`, seeds and plugins all reach `store()` without passing
	 * through it. The adapter is the backstop for those, not a second knob.
	 *
	 * Optional so a third-party adapter that doesn't cap sizes stays valid.
	 */
	setMaxFileSize?(bytes: number): void;

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

	/**
	 * Read an object back as a stream.
	 *
	 * Optional, and purely an optimisation of {@link getObject} — callers must
	 * fall back to buffering when an adapter doesn't implement it.
	 *
	 * It exists because buffering isn't merely wasteful on serverless hosts, it
	 * fails: Vercel Functions cap a *response body* at 4.5 MB and return 413
	 * `FUNCTION_PAYLOAD_TOO_LARGE` beyond it, while a streamed response has no
	 * such cap. So on the deployment target the serverless prep doc aims at, an
	 * ordinary 5 MB photo proxied through `getObject` is a hard error rather
	 * than a slow request.
	 *
	 * Implementations should stream from the underlying store rather than
	 * buffering and re-wrapping — for an HTTP-backed store that usually means
	 * handing back the upstream response body directly, which is less work than
	 * `getObject`, not more.
	 */
	getStream?(path: string): Promise<ReadableStream<Uint8Array>>;

	/**
	 * Read a byte range of an object as a stream.
	 *
	 * Optional. Callers must fall back to {@link getStream}/{@link getObject} and
	 * slice, which is correct but reads the whole object to serve a few hundred
	 * kilobytes of it.
	 *
	 * It exists for media. Without `206 Partial Content` a browser can still play
	 * a video, but only by downloading it progressively from byte zero: seeking to
	 * the last minute of a recording means transferring everything before it, and
	 * previewing three seconds costs a full-file read plus the egress to match.
	 * Small files hide this — a few megabytes over localhost feels instant — so it
	 * surfaces as "fine in dev, unusable in production". Both backends support
	 * ranged reads natively, so implementing this is *less* work than the buffered
	 * path, not more.
	 *
	 * **`end` is inclusive**, matching HTTP's `Range: bytes=start-end` rather than
	 * the half-open convention most APIs use. `getObjectRange(p, 0, 0)` yields one
	 * byte. Adapters wrapping an exclusive-end API must add one.
	 *
	 * Implementations may assume `0 <= start <= end`; the caller validates the
	 * range against the object size and answers `416` before calling.
	 */
	getObjectRange?(path: string, start: number, end: number): Promise<ReadableStream<Uint8Array>>;

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

	/**
	 * Generate a URL the browser can PUT a file to, bypassing this application.
	 *
	 * The reason it exists is a hard platform limit rather than a preference:
	 * a serverless host caps the *request* body it will accept (Vercel
	 * Functions: 4.5 MB) and, unlike responses, there is no streaming escape.
	 * An ordinary large photo therefore cannot reach the app at all, whatever
	 * `upload.maxFileSize` says. Sending it straight to the bucket is the only
	 * way through.
	 *
	 * Adapters that can't sign simply omit this; callers fall back to proxying
	 * the upload through the app, which works everywhere with no bucket CORS.
	 *
	 * The `path` is always derived server-side from a freshly minted asset id —
	 * a caller-supplied key would let anyone with upload permission write
	 * anywhere in the bucket, including over an existing asset.
	 *
	 * @param path - Destination path, server-derived
	 * @param expiresIn - Expiration in seconds. Keep short; this is a write grant.
	 * @param contentType - Binds the URL to a Content-Type when supported
	 */
	getSignedUploadUrl?(path: string, expiresIn?: number, contentType?: string): Promise<string>;

	/**
	 * Convert an adapter-relative key into this adapter's own path.
	 *
	 * `store()` normally returns both, but a direct browser upload never goes
	 * through `store()` — the server derives a key, hands out a signed URL, and
	 * later needs the path to read the object back and to record on the row.
	 * Reconstructing it by string surgery on another asset's path happens to
	 * work for the current two adapters and breaks on the next one.
	 */
	resolvePath?(key: string): string;
}

/**
 * Storage provider factory interface
 */
export interface StorageProvider {
	name: string;
	createAdapter(config: StorageConfig): StorageAdapter;
}
