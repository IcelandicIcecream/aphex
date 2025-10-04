// Aphex CMS Configuration
// This file defines the CMS configuration for your application
import { createCMSConfig } from '@aphex/cms-core/server';
// import { s3Storage } from '@aphex/storage-s3';
// import { env } from '$env/dynamic/private';
import * as schemas from './src/lib/schemaTypes';
import { authProvider } from './src/lib/server/auth';
import { client } from './src/lib/server/db';

export default createCMSConfig({
	schemas,
	database: {
		adapter: 'postgresql',
		client // Pass the initialized postgres client (recommended for database agnosticism)
	},
	// Storage: Defaults to local filesystem (./static/uploads)
	// To use S3-compatible storage (Cloudflare R2, AWS S3, MinIO, etc.):
	// storage: s3Storage({
	// 	bucket: env.R2_BUCKET,
	// 	endpoint: env.R2_ENDPOINT,
	// 	accessKeyId: env.R2_ACCESS_KEY_ID,
	// 	secretAccessKey: env.R2_SECRET_ACCESS_KEY,
	// 	publicUrl: env.R2_PUBLIC_URL
	// }),
	auth: {
		provider: authProvider,
		loginUrl: '/login' // Redirect here when unauthenticated
	},
	customization: {
		branding: {
			title: 'Aphex'
		}
	}
});
