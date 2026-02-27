// Aphex CMS Configuration
// This file defines the CMS configuration for your application
import { createCMSConfig } from '@aphexcms/cms-core/server';
import { schemaTypes } from './src/lib/schemaTypes/index.js';
import { authProvider } from './src/lib/server/auth';
import { db } from './src/lib/server/db';
// import { email } from './src/lib/server/email';
// import { storage } from './src/lib/server/storage';

export default createCMSConfig({
	schemaTypes,

	// Provide the shared database and storage adapter instances directly.
	// These are created once in their respective /lib/server/.. files.
	database: db,
	// storage: storageAdapter, <-- defaults to local if not added. - to enable setup storageAdapter in ./src/lib/server/storage
	// email, // Email adapter for sending emails

	auth: {
		provider: authProvider,
		loginUrl: '/login' // Redirect here when unauthenticated
	},

	// GraphQL is built-in and enabled by default. To customize:
	// graphql: { path: '/api/graphql', enableGraphiQL: true },
	// To disable: graphql: false,

	customization: {
		branding: {
			title: 'Aphex'
		}
	}
});
