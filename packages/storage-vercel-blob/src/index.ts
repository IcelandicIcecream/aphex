import { put, del, head, list } from '@vercel/blob';
import type {
	StorageAdapter,
	StorageProvider,
	StorageConfig,
	UploadFileData,
	StorageFile
} from '@aphexcms/cms-core/server';

export interface VercelBlobStorageConfig extends StorageConfig {
	options: {
		token: string;
	};
}

/**
 * Vercel Blob Storage Adapter
 *
 * Object storage backed by Vercel Blob (https://vercel.com/docs/vercel-blob). Blob
 * URLs are globally unique and already public, so unlike the S3 adapter there's no
 * separate bucket/publicUrl split — the value returned by `put()` IS the path,
 * the URL, and what `delete()`/`exists()` take back in.
 */
export class VercelBlobStorageAdapter implements StorageAdapter {
	readonly name = 'vercel-blob';
	private token: string;
	private config: Required<Omit<StorageConfig, 'options'>>;

	constructor(config: VercelBlobStorageConfig) {
		this.token = config.options.token;
		this.config = {
			basePath: config.basePath ?? '',
			baseUrl: config.baseUrl ?? '',
			maxFileSize: config.maxFileSize || 10 * 1024 * 1024 // 10MB default
		};
	}

	private pathnameFor(filename: string): string {
		return this.config.basePath ? `${this.config.basePath}/${filename}` : filename;
	}

	async store(data: UploadFileData): Promise<StorageFile> {
		if (data.size > this.config.maxFileSize) {
			throw new Error(`File too large: ${data.size} bytes`);
		}

		const blob = await put(this.pathnameFor(data.filename), data.buffer, {
			access: 'public',
			addRandomSuffix: true,
			contentType: data.mimeType,
			token: this.token
		});

		return { path: blob.url, url: blob.url, size: data.size };
	}

	async delete(path: string): Promise<boolean> {
		try {
			await del(path, { token: this.token });
			return true;
		} catch {
			return false;
		}
	}

	async exists(path: string): Promise<boolean> {
		try {
			await head(path, { token: this.token });
			return true;
		} catch {
			return false;
		}
	}

	getUrl(path: string): string {
		// Blob paths are already fully-qualified public URLs.
		return path;
	}

	async getStorageInfo(): Promise<{ totalSize: number }> {
		// TODO: Implement store size calculation (sum via list())
		return { totalSize: 0 };
	}

	async isHealthy(): Promise<boolean> {
		try {
			await list({ token: this.token, limit: 1 });
			return true;
		} catch {
			return false;
		}
	}

	async getSignedUrl(path: string): Promise<string> {
		return this.getUrl(path);
	}
}

export class VercelBlobStorageProvider implements StorageProvider {
	name = 'vercel-blob';
	createAdapter(config: StorageConfig): StorageAdapter {
		return new VercelBlobStorageAdapter(config as VercelBlobStorageConfig);
	}
}

/**
 * Helper function to configure Vercel Blob storage
 *
 * Zero-config when deployed on Vercel with a Blob store connected to the project —
 * `BLOB_READ_WRITE_TOKEN` is injected automatically, so `token` only needs to be
 * passed explicitly outside that context (e.g. local testing against a real store).
 *
 * @example
 * ```typescript
 * import { vercelBlobStorage } from '@aphexcms/storage-vercel-blob';
 *
 * export default createCMSConfig({
 *   storage: vercelBlobStorage({ token: env.BLOB_READ_WRITE_TOKEN }).adapter
 * });
 * ```
 */
export function vercelBlobStorage(config: {
	token: string;
	basePath?: string;
	maxFileSize?: number;
}) {
	return {
		adapter: new VercelBlobStorageAdapter({
			basePath: config.basePath ?? '',
			maxFileSize: config.maxFileSize,
			options: { token: config.token }
		}),
		disableLocalStorage: true
	};
}
