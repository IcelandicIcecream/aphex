// apps/studio/src/lib/server/storage/index.ts
import { s3Storage } from '@aphexcms/storage-s3';
import { createStorageAdapter } from '@aphexcms/cms-core/server';
import { env } from '$env/dynamic/private';
import type { StorageAdapter } from '@aphexcms/cms-core/server';

let storageAdapter: StorageAdapter;

// Check for R2/S3 environment variables
if (env.R2_BUCKET && env.R2_ENDPOINT && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY) {
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
	// Otherwise, default to local filesystem storage.
	//
	// The directory sits OUTSIDE `static/` deliberately. Everything under `static/` is
	// published at the site root and copied into the build output, so uploads kept
	// there are readable by anyone who can guess the path — no session, no access
	// check — and any file present at build time ships inside the artifact for good.
	// That would quietly defeat `private: true`, which is enforced by the
	// `/media/:id/:filename` route and only there. Out here, that route is the single
	// way to reach an asset, so the privacy check cannot be walked around.
	//
	// APHEX_UPLOADS_DIR moves the directory without touching code — the one thing a
	// container deploy needs, since the default lives inside the image and evaporates
	// on every redeploy. Point it at a mounted volume (`/data/uploads`) and uploads
	// survive. Stored asset URLs are `/media/:id/:filename` and resolve through this
	// adapter, so moving the directory doesn't rewrite anything already in the
	// database — but it doesn't move the existing files either. Set it before the
	// first upload, or copy the old directory across.
	storageAdapter = createStorageAdapter('local', {
		basePath: env.APHEX_UPLOADS_DIR || './uploads',
		// Vestigial: `getUrl()` is never called — every asset URL is built by
		// `buildAssetUrl` as `/media/:id/:filename`, which is the only served route.
		baseUrl: '/uploads'
	});
}

// Export the single, shared storage adapter instance
export { storageAdapter };
