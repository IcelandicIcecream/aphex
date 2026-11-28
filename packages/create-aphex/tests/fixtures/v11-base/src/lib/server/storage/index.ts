// apps/studio/src/lib/server/storage/index.ts
import { s3Storage } from '@aphexcms/storage-s3';
import { createStorageAdapter } from '@aphexcms/cms-core/server';
import { env } from '$env/dynamic/private';
import type { StorageAdapter } from '@aphexcms/cms-core/server';

let storageAdapter: StorageAdapter;

// Object storage — one S3-compatible configuration, whatever the provider behind it
// is (Cloudflare R2, AWS S3, MinIO, Backblaze B2, Hetzner, Tigris).
//
// `S3_*` is the canonical spelling. The original `R2_*` names are still read, so a
// deployment configured before the rename keeps working with nothing to change. Per
// variable `S3_` wins when both are set — otherwise a half-migrated environment
// would quietly keep using the old value while the new one looked applied.
const readStorageEnv = (name: string): string | undefined =>
	env[`S3_${name}`] || env[`R2_${name}`] || undefined;

// The first four are required together, and the fallback is silent by nature: a
// single typo'd variable name drops you onto local disk, where uploads land inside
// the container and the next deploy discards them — with the app looking entirely
// healthy until then. So say out loud when the set is incomplete, rather than
// letting a partial configuration read as "no bucket configured".
const REQUIRED_STORAGE_VARS = ['BUCKET', 'ENDPOINT', 'ACCESS_KEY_ID', 'SECRET_ACCESS_KEY'] as const;
const missingStorageVars = REQUIRED_STORAGE_VARS.filter((name) => !readStorageEnv(name));
if (missingStorageVars.length > 0 && missingStorageVars.length < REQUIRED_STORAGE_VARS.length) {
	console.warn(
		`[aphex] Object storage is partially configured — missing ${missingStorageVars
			.map((name) => `S3_${name}`)
			.join(', ')}. ` +
			'Falling back to local disk, where uploads do not survive a redeploy. Set all of ' +
			`${REQUIRED_STORAGE_VARS.map((name) => `S3_${name}`).join(', ')} to use the bucket.`
	);
}

const s3Bucket = readStorageEnv('BUCKET');
const s3Endpoint = readStorageEnv('ENDPOINT');
const s3AccessKeyId = readStorageEnv('ACCESS_KEY_ID');
const s3SecretAccessKey = readStorageEnv('SECRET_ACCESS_KEY');

if (s3Bucket && s3Endpoint && s3AccessKeyId && s3SecretAccessKey) {
	// A complete bucket configuration — use it.
	storageAdapter = s3Storage({
		bucket: s3Bucket,
		endpoint: s3Endpoint,
		accessKeyId: s3AccessKeyId,
		secretAccessKey: s3SecretAccessKey,
		publicUrl: readStorageEnv('PUBLIC_URL') || '',
		baseUrl: readStorageEnv('CDN_URL'),
		// Defaults to 'auto', which is what R2 wants and what AWS S3 rejects: the
		// region is part of the SigV4 credential scope, so against a real S3 bucket
		// every request signs as `auto` and comes back SignatureDoesNotMatch with the
		// config looking correct. Leave it unset for R2 and MinIO; set it to the
		// bucket's region for AWS.
		region: readStorageEnv('REGION')
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
		// Asset rows created before the storage-root move contain this prefix.
		// Once `static/uploads` is moved to the current base, rebase those paths
		// without allowing reads from the old public directory.
		options: { legacyBasePaths: ['./static/uploads', './uploads'] },
		// Vestigial: `getUrl()` is never called — every asset URL is built by
		// `buildAssetUrl` as `/media/:id/:filename`, which is the only served route.
		baseUrl: '/uploads'
	});
}

// Export the single, shared storage adapter instance
export { storageAdapter };
