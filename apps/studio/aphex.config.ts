// Aphex CMS Configuration
// This file defines the CMS configuration for your application
import { createCMSConfig } from '@aphex/cms-core/server';
import * as schemas from './src/lib/schemaTypes';
import { authProvider } from './src/lib/server/auth';
import { db } from './src/lib/server/db';
// import { storageAdapter } from './src/lib/server/storage';

export default createCMSConfig({
	schemas,

	// Provide the shared database and storage adapter instances directly.
	// These are created once in their respective /lib/server/.. files.
	database: db,
	// storage: storageAdapter, <-- defaults to local if not added. - to enable setup storageAdapter in ./src/lib/server/storage

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
