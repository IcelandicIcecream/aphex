// Aphex CMS Configuration
// This file defines the CMS configuration for your application
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { createCMSConfig } from '@aphexcms/cms-core/server';
import { createOpenAIAdapter } from '@aphexcms/ai-openai';
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

	// In-admin agent model backend. Points at a local OpenAI-compatible router
	// (AGENT_BASE_URL) for manual testing of POST /api/agent/chat — swap for a real
	// createOpenAIAdapter/createAnthropicAdapter/createOllamaCompatAdapter once a
	// provider is chosen. Unset (both undefined/null) when AGENT_BASE_URL isn't set, so
	// the route 404s rather than existing half-configured.
	aiProvider: env.AGENT_BASE_URL
		? createOpenAIAdapter({ apiKey: env.AGENT_API_KEY || 'local', baseURL: env.AGENT_BASE_URL })
		: null,
	agentModel: env.AGENT_BASE_URL ? (env.AGENT_MODEL ?? 'gpt-5.4-mini') : undefined,

	auth: {
		provider: authProvider,
		loginUrl: '/login' // Redirect here when unauthenticated
	},

	security: {
		// Encrypts plugin `secret` settings at rest (AES-256-GCM). Optional — when
		// unset, secret settings fields are disabled (read-only) rather than stored as
		// plaintext. Keep it stable across deploys; rotating it orphans existing secrets.
		// Read via `$env/dynamic/private` — SvelteKit does NOT put `.env` into process.env.
		secretEncryptionKey: env.APHEX_SECRET_ENCRYPTION_KEY
	},

	// Background jobs — the durable spine that runs scheduled publishes and event consumers.
	// Two ways to drive it:
	//   - `embedded`: an in-process loop inside this app (no separate process, no secret). On in
	//     dev so the queue "just works" — schedule a publish or submit a form and the consumer
	//     fires seconds later. For horizontally-scaled prod, turn this off and use the dedicated
	//     worker loop / cron instead so N replicas don't each run a loop.
	//   - `workerSecret`: gates POST /api/internal/workers/run for platform cron / `pnpm worker`.
	jobs: {
		embedded: dev,
		workerSecret: env.APHEX_WORKER_SECRET
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
