// Aphex CMS Configuration
// This file defines the CMS configuration for your application
import { createCMSConfig } from '@aphex/cms-core/server';
import * as schemas from './src/lib/schemaTypes';
import { authProvider } from './src/lib/server/auth';
import { client } from './src/lib/server/db';

export default createCMSConfig({
	schemas,
	database: {
		adapter: 'postgresql',
		client // Pass the initialized postgres client (recommended for database agnosticism)
	},
	storage: {
		adapter: 'local',
		basePath: './static/uploads',
		baseUrl: '/uploads'
	},
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
