// // apps/studio/src/lib/server/storage/index.ts
// import { s3Storage } from '@aphexcms/storage-s3';
// import { createStorageAdapter } from '@aphexcms/cms-core/server';
// import { env } from '$env/dynamic/private';
// import type { StorageAdapter } from '@aphexcms/cms-core/server';

// let storageAdapter: StorageAdapter;

// // Check for R2/S3 environment variables
// if (env.R2_BUCKET && env.R2_ENDPOINT && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY) {
// 	// If all R2/S3 variables are present, create an S3 storage adapter.
// 	// The s3Storage helper returns a config object, so we extract the adapter itself.
// 	storageAdapter = s3Storage({
// 		bucket: env.R2_BUCKET,
// 		endpoint: env.R2_ENDPOINT,
// 		accessKeyId: env.R2_ACCESS_KEY_ID,
// 		secretAccessKey: env.R2_SECRET_ACCESS_KEY,
// 		publicUrl: env.R2_PUBLIC_URL || ''
// 	}).adapter;
// } else {
// 	// Otherwise, default to local filesystem storage
// 	storageAdapter = createStorageAdapter('local', {
// 		basePath: './static/uploads',
// 		baseUrl: '/uploads'
// 	});
// }

// // Export the single, shared storage adapter instance
// export { storageAdapter };
