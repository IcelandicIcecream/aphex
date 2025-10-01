// Aphex CMS Configuration
// This file defines the CMS configuration for your application
import { createCMSConfig } from '@aphex/cms-core/server';
import * as schemas from './src/lib/schemaTypes';
import { DATABASE_URL } from '$env/static/private';

export default createCMSConfig({
	schemas,
	database: {
		adapter: 'postgresql',
		connectionString: DATABASE_URL
	},
	storage: {
		adapter: 'local',
		basePath: './static/uploads',
		baseUrl: '/uploads'
	},
	customization: {
		branding: {
			title: 'TCR CMS'
		}
	}
});
