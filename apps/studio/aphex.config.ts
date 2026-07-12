// Aphex CMS Configuration
// This file defines the CMS configuration for your application
import { createCMSConfig } from '@aphexcms/cms-core/server';
import { schemaTypes } from './src/lib/schemaTypes/index.js';
// Single plugin entrypoint. Declared once in a client-safe file (the admin imports
// the same array for component parts); the server ingests its schema/route parts here.
import { plugins } from './src/lib/plugins.js';
import { authProvider } from './src/lib/server/auth';
import { db } from './src/lib/server/db';
import { email } from './src/lib/server/email';
import { registerInvitationEmailHook } from './src/lib/server/email/invitation-hook';
import { storageAdapter } from './src/lib/server/storage';
import { cacheAdapter } from './src/lib/server/cache';

/**
 * 👀 Preview perspective — the one knob to flip while developing. Change the return:
 *
 *   'auto'      → drafts while developing (when signed in), published otherwise;
 *                 the visual editor still shows drafts via ?aphex-preview. Safe default.
 *   'draft'     → always show unpublished drafts. "I want to see draft now."
 *   'published' → always show the live/published site.
 *
 * Anonymous visitors ALWAYS get published regardless of this — drafts never leak.
 * (Wired into `preview.resolvePerspective` below.)
 */
function previewAs(): 'auto' | 'draft' | 'published' {
	return 'auto';
}

export default createCMSConfig({
	schemaTypes,
	plugins,

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

	// Reads the PREVIEW_AS knob above. The CMS hook runs this once per request and
	// stores the result on `locals.previewPerspective`, which site loads inherit via
	// `siteContext`. Queries that pass an explicit perspective (e.g. the sitemap) win.
	preview: {
		resolvePerspective: ({ auth, url }) => {
			if (auth?.type !== 'session') return 'published'; // anonymous → never drafts
			const mode = previewAs();
			if (mode === 'draft') return 'draft';
			if (mode === 'published') return 'published';
			// 'auto': drafts while developing, or inside the ?aphex-preview editor session.
			if (process.env.NODE_ENV !== 'production') return 'draft';
			return url.searchParams.has('aphex-preview') ? 'draft' : 'published';
		}
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
