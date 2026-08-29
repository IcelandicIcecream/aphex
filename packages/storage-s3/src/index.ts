import { S3mini } from 's3mini';
import type {
	StorageAdapter,
	StorageProvider,
	StorageConfig,
	UploadFileData,
	StorageFile,
	StorageObjectMetadata,
	ListObjectsOptions,
	ListObjectsResult
} from '@aphexcms/cms-core/server';

export interface S3StorageConfig extends StorageConfig {
	options: {
		bucket: string;
		endpoint: string;
		accessKeyId: string;
		secretAccessKey: string;
		region?: string;
		publicUrl?: string;
	};
}

/**
 * S3-Compatible Storage Adapter
 *
 * This adapter uses the S3-compatible API to store files in any S3-compatible storage service:
 * - AWS S3
 * - Cloudflare R2
 * - MinIO
 * - DigitalOcean Spaces
 * - Backblaze B2
 * - Any other S3-compatible service
 *
 * Key design decisions:
 * - Stored paths include the bucket name (e.g., "my-bucket/filename.jpg")
 * - Public URLs can use custom CDN/public URLs without the bucket prefix
 * - This separation allows S3 API to work correctly while serving public URLs cleanly
 *
 * ## Paths vs. keys
 *
 * `StorageFile.path` — what the CMS persists in `cms_assets.path` — is
 * bucket-prefixed. The S3 *key* handed to s3mini is not: the client is
 * constructed against a **bucket-scoped endpoint** (`{endpoint}/{bucket}`), so
 * it addresses objects relative to the bucket.
 *
 * This matters beyond tidiness. s3mini derives its own `bucketName` from the
 * endpoint (path segment first, then subdomain) and uses it to build the
 * `x-amz-copy-source` header and to scope `listObjects`/`bucketExists`. Given an
 * account-level endpoint like `https://<account>.r2.cloudflarestorage.com`, that
 * derivation yields the *account hash*, so those operations silently address a
 * bucket that does not exist — `listObjects` returns 501 NotImplemented,
 * `copyObject` builds a bogus source, and `bucketExists` reports a perfectly
 * healthy bucket as down. Scoping the endpoint to the bucket makes the
 * derivation correct and those operations usable.
 *
 * Callers are unaffected: {@link toKey} strips the prefix on the way in and
 * {@link toPath} restores it on the way out, so every path this adapter has ever
 * returned keeps working.
 */
export class S3StorageAdapter implements StorageAdapter {
	readonly name = 's3';
	private client: S3mini;
	private bucket: string;
	private publicUrl: string;
	private config: Required<Omit<StorageConfig, 'options'>>;

	constructor(config: S3StorageConfig) {
		const { bucket, endpoint, accessKeyId, secretAccessKey, region, publicUrl } = config.options;

		this.bucket = bucket;
		this.client = new S3mini({
			endpoint: S3StorageAdapter.bucketScopedEndpoint(endpoint, bucket),
			accessKeyId,
			secretAccessKey,
			region: region || 'auto'
		});

		this.publicUrl = publicUrl || endpoint;
		this.config = {
			basePath: config.basePath ?? '',
			baseUrl: config.baseUrl || this.publicUrl,
			maxFileSize: config.maxFileSize || 10 * 1024 * 1024 // 10MB default
		};
	}

	/**
	 * Append the bucket to the endpoint unless it is already scoped to it, so a
	 * user who configured a bucket-scoped endpoint themselves doesn't end up with
	 * `.../my-bucket/my-bucket/...`.
	 */
	private static bucketScopedEndpoint(endpoint: string, bucket: string): string {
		const trimmed = endpoint.replace(/\/+$/, '');
		return trimmed.endsWith(`/${bucket}`) ? trimmed : `${trimmed}/${bucket}`;
	}

	/** Bucket-prefixed stored path -> bucket-relative S3 key. */
	private toKey(path: string): string {
		const withoutBucket = path.startsWith(`${this.bucket}/`)
			? path.slice(this.bucket.length + 1)
			: path;
		return withoutBucket.replace(/^\/+/, '');
	}

	/** Bucket-relative S3 key -> the bucket-prefixed path the CMS stores. */
	private toPath(key: string): string {
		return `${this.bucket}/${key.replace(/^\/+/, '')}`;
	}

	private generateUniqueFilename(originalFilename: string): string {
		const lastDot = originalFilename.lastIndexOf('.');
		const name = lastDot > -1 ? originalFilename.substring(0, lastDot) : originalFilename;
		const ext = lastDot > -1 ? originalFilename.substring(lastDot) : '';
		return `${name}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
	}

	async store(data: UploadFileData): Promise<StorageFile> {
		if (data.size > this.config.maxFileSize) {
			throw new Error(`File too large: ${data.size} bytes`);
		}

		// An explicit key is authoritative — the caller owns uniqueness and wants
		// a predictable location (e.g. `{assetId}/original.png`, so variants can
		// be written alongside it). Otherwise fall back to a generated name.
		const filename = data.key ?? this.generateUniqueFilename(data.filename);

		// Bucket-relative key; also the public URL path, since the public URL
		// already points at the bucket.
		const key = this.config.basePath ? `${this.config.basePath}/${filename}` : filename;

		// Ensure proper Buffer format for fetch API compatibility
		const buffer = Buffer.isBuffer(data.buffer) ? data.buffer : Buffer.from(data.buffer);

		await this.client.putObject(key, buffer, data.mimeType);

		return {
			key,
			path: this.toPath(key),
			url: `${this.config.baseUrl}/${key}`,
			size: data.size
		};
	}

	async delete(path: string): Promise<boolean> {
		return await this.client.deleteObject(this.toKey(path));
	}

	async exists(path: string): Promise<boolean> {
		try {
			const response = await this.client.objectExists(this.toKey(path));
			return Boolean(response?.valueOf?.() ?? response);
		} catch {
			// existence check failed
			return false;
		}
	}

	/**
	 * Read an object back as a Buffer.
	 *
	 * Uses `getObjectArrayBuffer` rather than `getObject`: the latter decodes the
	 * response as text, which corrupts every binary payload the CMS stores. The
	 * image pipeline reads originals back out of storage to derive variants, so a
	 * byte-exact round-trip is a hard requirement, not a nicety.
	 */
	async getObject(path: string): Promise<Buffer> {
		const key = this.toKey(path);
		const arrayBuffer = await this.client.getObjectArrayBuffer(key);
		if (!arrayBuffer) {
			throw new Error(`Object not found: ${path}`);
		}
		return Buffer.from(arrayBuffer);
	}

	/**
	 * Stream an object rather than buffering it.
	 *
	 * This hands back the upstream response body untouched, so the bytes never
	 * accumulate in the process — strictly less work than `getObject`, which
	 * reads the whole object into an ArrayBuffer first. It's what lets the
	 * `/media` route serve a file larger than a serverless host's response-body
	 * cap.
	 */
	async getStream(path: string): Promise<ReadableStream<Uint8Array>> {
		const key = this.toKey(path);
		const response = await this.client.getObjectResponse(key);
		if (!response?.body) {
			throw new Error(`Object not found: ${path}`);
		}
		return response.body;
	}

	async listObjects(options: ListObjectsOptions = {}): Promise<ListObjectsResult> {
		// Scope to basePath so an adapter configured with a prefix never lists
		// objects outside it.
		const prefixParts = [this.config.basePath, options.prefix].filter(Boolean);
		const prefix = prefixParts.join('/');

		// s3mini's first argument is named `delimiter`, but it is the request path
		// rather than an S3 delimiter — it is never sent as a query parameter, so
		// the listing is always flat (no CommonPrefixes) and '/' means "the bucket
		// root". It rejects an empty string, so pass '/' explicitly.
		const objects = await this.client.listObjects('/', prefix, options.maxKeys);

		return {
			objects: (objects ?? []).map((object) => ({
				key: this.toPath(object.Key),
				size: object.Size,
				lastModified: object.LastModified,
				etag: object.ETag
			})),
			// s3mini pages internally and resolves the full listing, so there is
			// never a continuation token left for the caller to follow.
			isTruncated: false
		};
	}

	async copyObject(sourcePath: string, destPath: string): Promise<boolean> {
		const result = await this.client.copyObject(this.toKey(sourcePath), this.toKey(destPath));
		return Boolean(result?.etag);
	}

	async getObjectMetadata(path: string): Promise<StorageObjectMetadata> {
		const key = this.toKey(path);
		// Two HEADs rather than one: s3mini exposes size and etag as separate
		// calls and no combined head-object helper.
		const [size, etag] = await Promise.all([
			this.client.getContentLength(key),
			this.client.getEtag(key)
		]);

		return {
			key: path,
			size,
			// s3mini's HEAD helpers don't surface Last-Modified. Callers that need
			// it should use listObjects, which does.
			lastModified: new Date(0),
			etag: etag ?? undefined
		};
	}

	getUrl(path: string): string {
		// Strip bucket prefix from stored path for public URLs
		// Example: "my-bucket/image.jpg" -> "image.jpg"
		const pathWithoutBucket = path.startsWith(`${this.bucket}/`)
			? path.slice(this.bucket.length + 1)
			: path;
		return `${this.config.baseUrl}/${pathWithoutBucket}`;
	}

	async getStorageInfo(): Promise<{ totalSize: number }> {
		// TODO: Implement bucket size calculation
		return { totalSize: 0 };
	}

	async isHealthy(): Promise<boolean> {
		try {
			// Correct only because the client is scoped to the bucket (see the class
			// docblock): `bucketExists` HEADs the endpoint root, which against an
			// account-level endpoint probes the account rather than the bucket and
			// reports a working bucket as down.
			return await this.client.bucketExists();
		} catch {
			return false;
		}
	}

	/**
	 * Generate a time-limited download URL for a private object.
	 *
	 * Signed against the bucket-scoped endpoint, so the returned URL addresses the
	 * S3 API directly rather than `publicUrl`/CDN — a CDN hostname is not part of
	 * the signature and would reject it.
	 *
	 * @param expiresIn - Lifetime in seconds. S3 caps this at 7 days.
	 */
	async getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
		return await this.client.getPresignedUrl('GET', this.toKey(path), expiresIn);
	}

	/**
	 * Generate a time-limited upload URL, letting a browser PUT straight to the
	 * bucket instead of streaming the bytes through the CMS.
	 *
	 * `contentType` is signed when provided, which means the client MUST send that
	 * exact `Content-Type` header or the request is rejected.
	 *
	 * Not part of {@link StorageAdapter} — callers reach for it via the concrete
	 * adapter type.
	 */
	async getSignedUploadUrl(path: string, expiresIn = 300, contentType?: string): Promise<string> {
		return await this.client.getPresignedUrl(
			'PUT',
			this.toKey(path),
			expiresIn,
			{},
			contentType ? { 'Content-Type': contentType } : {}
		);
	}
}

export class S3StorageProvider implements StorageProvider {
	name = 's3';
	createAdapter(config: StorageConfig): StorageAdapter {
		return new S3StorageAdapter(config as S3StorageConfig);
	}
}

/**
 * Helper function to configure S3-compatible storage
 *
 * Works with any S3-compatible service including AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces, etc.
 *
 * @param config - S3 configuration options
 * @param config.bucket - Bucket name
 * @param config.endpoint - S3 endpoint URL
 * @param config.accessKeyId - API access key ID
 * @param config.secretAccessKey - API secret access key
 * @param config.publicUrl - Public URL for file access (optional, uses endpoint if not provided)
 * @param config.region - AWS region (defaults to 'auto')
 * @param config.basePath - Optional path prefix for organizing files
 * @param config.maxFileSize - Maximum file size in bytes (default: 10MB)
 *
 * @example Cloudflare R2
 * ```typescript
 * import { s3Storage } from '@aphexcms/storage-s3';
 *
 * export default createCMSConfig({
 *   storage: s3Storage({
 *     bucket: env.R2_BUCKET,
 *     endpoint: env.R2_ENDPOINT,
 *     accessKeyId: env.R2_ACCESS_KEY_ID,
 *     secretAccessKey: env.R2_SECRET_ACCESS_KEY,
 *     publicUrl: env.R2_PUBLIC_URL
 *   })
 * });
 * ```
 *
 * @example AWS S3
 * ```typescript
 * import { s3Storage } from '@aphexcms/storage-s3';
 *
 * export default createCMSConfig({
 *   storage: s3Storage({
 *     bucket: 'my-bucket',
 *     endpoint: 'https://s3.us-east-1.amazonaws.com',
 *     accessKeyId: env.AWS_ACCESS_KEY_ID,
 *     secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
 *     region: 'us-east-1'
 *   })
 * });
 * ```
 *
 * @example MinIO
 * ```typescript
 * import { s3Storage } from '@aphexcms/storage-s3';
 *
 * export default createCMSConfig({
 *   storage: s3Storage({
 *     bucket: 'my-bucket',
 *     endpoint: 'http://localhost:9000',
 *     accessKeyId: 'minioadmin',
 *     secretAccessKey: 'minioadmin'
 *   })
 * });
 * ```
 */
export function s3Storage(config: {
	bucket: string;
	endpoint: string;
	accessKeyId: string;
	secretAccessKey: string;
	region?: string;
	publicUrl?: string;
	basePath?: string;
	baseUrl?: string;
	maxFileSize?: number;
}) {
	return {
		adapter: new S3StorageAdapter({
			basePath: config.basePath ?? '',
			baseUrl: config.baseUrl || config.publicUrl || config.endpoint,
			maxFileSize: config.maxFileSize,
			options: {
				bucket: config.bucket,
				endpoint: config.endpoint,
				accessKeyId: config.accessKeyId,
				secretAccessKey: config.secretAccessKey,
				region: config.region,
				publicUrl: config.publicUrl
			}
		}),
		disableLocalStorage: true
	};
}
