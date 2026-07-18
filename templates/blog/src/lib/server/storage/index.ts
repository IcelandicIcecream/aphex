// apps/studio/src/lib/server/storage/index.ts
import { s3Storage } from '@aphexcms/storage-s3';
import { vercelBlobStorage } from '@aphexcms/storage-vercel-blob';
import { createStorageAdapter } from '@aphexcms/cms-core/server';
import { env } from '$env/dynamic/private';
import type { StorageAdapter } from '@aphexcms/cms-core/server';

let storageAdapter: StorageAdapter;

// BLOB_READ_WRITE_TOKEN is injected automatically when a Vercel Blob store is
// connected to the project (including via the "Deploy to Vercel" button's `stores`
// param) — check it first so a Vercel deploy gets working storage with zero manual
// configuration.
if (env.BLOB_READ_WRITE_TOKEN) {
	storageAdapter = vercelBlobStorage({ token: env.BLOB_READ_WRITE_TOKEN }).adapter;
} else if (env.R2_BUCKET && env.R2_ENDPOINT && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY) {
	// If all R2/S3 variables are present, create an S3 storage adapter.
	storageAdapter = s3Storage({
		bucket: env.R2_BUCKET,
		endpoint: env.R2_ENDPOINT,
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY,
		publicUrl: env.R2_PUBLIC_URL || '',
		baseUrl: env.R2_CDN_URL || undefined
	}).adapter;
} else {
	// Otherwise, default to local filesystem storage. Note: this does NOT persist
	// on Vercel (serverless filesystem is ephemeral/read-only) — fine for local dev,
	// but production on Vercel needs BLOB_READ_WRITE_TOKEN or R2/S3 vars above.
	storageAdapter = createStorageAdapter('local', {
		basePath: './static/uploads',
		baseUrl: '/uploads'
	});
}

// Export the single, shared storage adapter instance
export { storageAdapter };
