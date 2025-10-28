import { S3mini } from 's3mini';
import type {
	StorageAdapter,
	StorageProvider,
	StorageConfig,
	UploadFileData,
	StorageFile
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
 * - Storage keys include the bucket name (e.g., "my-bucket/filename.jpg")
 * - Public URLs can use custom CDN/public URLs without the bucket prefix
 * - This separation allows S3 API to work correctly while serving public URLs cleanly
 */
export class S3StorageAdapter implements StorageAdapter {
	readonly name = 's3';
	private client: S3mini;
	private bucket: string;
	private publicUrl: string;
	private config: Required<Omit<StorageConfig, 'options'>>;

	constructor(config: S3StorageConfig) {
		const { bucket, endpoint, accessKeyId, secretAccessKey, region, publicUrl } = config.options;

		this.client = new S3mini({
			endpoint,
			accessKeyId,
			secretAccessKey,
			region: region || 'auto'
		});

		this.bucket = bucket;
		this.publicUrl = publicUrl || endpoint;
		this.config = {
			basePath: config.basePath ?? '',
			baseUrl: config.baseUrl || this.publicUrl,
			maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB default
			allowedTypes: config.allowedTypes || [
				'image/jpeg',
				'image/png',
				'image/webp',
				'image/gif',
				'image/avif'
			]
		};
	}

	private generateUniqueFilename(originalFilename: string): string {
		const lastDot = originalFilename.lastIndexOf('.');
		const name = lastDot > -1 ? originalFilename.substring(0, lastDot) : originalFilename;
		const ext = lastDot > -1 ? originalFilename.substring(lastDot) : '';
		return `${name}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
	}

	async store(data: UploadFileData): Promise<StorageFile> {
		if (!this.config.allowedTypes.includes(data.mimeType)) {
			throw new Error(`Invalid file type: ${data.mimeType}`);
		}

		if (data.size > this.config.maxFileSize) {
			throw new Error(`File too large: ${data.size} bytes`);
		}

		const filename = this.generateUniqueFilename(data.filename);

		// S3 operations require bucket in the key path
		const s3Key = this.config.basePath
			? `${this.bucket}/${this.config.basePath}/${filename}`
			: `${this.bucket}/${filename}`;

		// Public URL path excludes bucket (public URL already points to bucket)
		const publicPath = this.config.basePath ? `${this.config.basePath}/${filename}` : filename;

		// Ensure proper Buffer format for fetch API compatibility
		const buffer = Buffer.isBuffer(data.buffer) ? data.buffer : Buffer.from(data.buffer);

		await this.client.putObject(s3Key, buffer, data.mimeType);

		return {
			path: s3Key,
			url: `${this.config.baseUrl}/${publicPath}`,
			size: data.size
		};
	}

	async delete(path: string): Promise<boolean> {
		return await this.client.deleteObject(path);
	}

	async exists(path: string): Promise<boolean> {
		try {
			const response = await this.client.objectExists(path);
			return Boolean(response?.valueOf?.() ?? response);
		} catch (error) {
			console.error(`Error checking existence of ${path}:`, error);
			return false;
		}
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
			return await this.client.bucketExists();
		} catch {
			return false;
		}
	}

	async getSignedUrl(path: string): Promise<string> {
		// TODO: Implement AWS Signature V4 for private file access
		// For now, return public URL
		return this.getUrl(path);
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
 * @param config.allowedTypes - Allowed MIME types (default: common image types)
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
	allowedTypes?: string[];
}) {
	return {
		adapter: new S3StorageAdapter({
			basePath: config.basePath ?? '',
			baseUrl: config.baseUrl || config.publicUrl || config.endpoint,
			maxFileSize: config.maxFileSize,
			allowedTypes: config.allowedTypes,
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
