// Aphex CMS Configuration
// This file defines the CMS configuration for your application
import { createCMSConfig } from '@aphexcms/cms-core/server';
import { schemaTypes } from './src/lib/schemaTypes/index.js';
import { authProvider } from './src/lib/server/auth';
import { db } from './src/lib/server/db';
import { email } from './src/lib/server/email';
import { registerInvitationEmailHook } from './src/lib/server/email/invitation-hook';
import { storageAdapter } from './src/lib/server/storage';
import { cacheAdapter } from './src/lib/server/cache';

export default createCMSConfig({
	schemaTypes,

	// Provide the shared database and storage adapter instances directly.
	// These are created once in their respective /lib/server/.. files.
	database: db,
	storage: storageAdapter,
	email,
	cache: cacheAdapter,

	auth: {
		provider: authProvider,
		loginUrl: '/login' // Redirect here when unauthenticated
	},

	// GraphQL is built-in and enabled by default.
	// Set to false to disable, or pass config: { defaultPerspective: 'draft', path: '/api/graphql' }
	graphql: {
		defaultPerspective: 'draft',
		path: '/api/aphex-graphql'
	},

	customization: {
		branding: {
			title: 'Aphex'
		}
	},

	// Wrap built-in handlers with side effects (e.g. send the invitation
	// email after the invite is created). Runs BEFORE built-in routes mount.
	api: (app) => {
		registerInvitationEmailHook(app);
	}
});
