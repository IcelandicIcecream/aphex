// Aphex CMS Configuration
// This file defines the CMS configuration for your application
import { createCMSConfig } from '@aphex/cms-core/server';
import { r2Storage } from '@aphex/storage-r2';
import { env } from '$env/dynamic/private';
import * as schemas from './src/lib/schemaTypes';
import { authProvider } from './src/lib/server/auth';
import { client } from './src/lib/server/db';

export default createCMSConfig({
	schemas,
	database: {
		adapter: 'postgresql',
		client // Pass the initialized postgres client (recommended for database agnosticism)
	},
	storage: r2Storage({
		bucket: env.R2_BUCKET,
		endpoint: env.R2_ENDPOINT,
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY,
		publicUrl: env.R2_PUBLIC_URL
	}),
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
