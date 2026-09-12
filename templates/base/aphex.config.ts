// Aphex CMS Configuration
// This file defines the CMS configuration for your application
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { createOpenAIAdapter } from '@aphexcms/ai-openai';
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

/** `true`/`1`/`yes`/`on` (any case) — anything else, including unset, is false. */
function isTruthy(value: string | undefined): boolean {
	return ['true', '1', 'yes', 'on'].includes((value ?? '').toLowerCase());
}

const agentAPIKey = env.AGENT_API_KEY?.trim();
const agentModel = env.AGENT_MODEL?.trim();
const agentBaseURL = env.AGENT_BASE_URL?.trim();

// Nothing drains the job queue unless one of the two drivers below is configured.
// In production that failure is silent by construction: a scheduled publish is
// accepted and simply never happens, an event consumer never fires, and no error
// is raised because nothing failed — the work is only ever not picked up. One line
// at boot beats discovering it from a post that didn't publish.
if (!dev && !isTruthy(env.APHEX_EMBEDDED_WORKER) && !env.APHEX_WORKER_SECRET) {
	console.warn(
		'[aphex] No job worker configured — scheduled publishes and event consumers will ' +
			'not run. Set APHEX_EMBEDDED_WORKER=true for a single-instance deploy, or ' +
			'APHEX_WORKER_SECRET plus a cron hitting POST /api/internal/workers/run.'
	);
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

	// The assistant stays completely disabled unless both required values are set.
	// Omit AGENT_BASE_URL for OpenAI, or set it for any compatible endpoint.
	aiProvider:
		agentAPIKey && agentModel
			? createOpenAIAdapter({ apiKey: agentAPIKey, baseURL: agentBaseURL })
			: null,
	agentModel: agentAPIKey && agentModel ? agentModel : undefined,

	auth: {
		provider: authProvider,
		loginUrl: '/login' // Redirect here when unauthenticated
	},

	security: {
		// Encrypts plugin `secret` settings at rest (AES-256-GCM). Optional — when
		// unset, secret settings fields are disabled (read-only) rather than stored as
		// plaintext. Keep it stable across deploys; rotating it orphans existing secrets.
		// Read via `$env/dynamic/private` — SvelteKit does NOT put `.env` into process.env.
		secretEncryptionKey: env.APHEX_SECRET_ENCRYPTION_KEY,

		// Signs `/media/:id/:filename` URLs, so a private asset can be handed to a
		// viewer with no admin session — one asset, for a bounded window. Mint links
		// with `signAssetUrl` from `@aphexcms/cms-core/server`. When unset, signing
		// is a no-op and verification always fails, so private assets remain
		// reachable only with a session (fail closed).
		assetSigningSecret: env.APHEX_ASSET_SIGNING_SECRET
	},

	// Background jobs — the durable spine that runs scheduled publishes and event consumers.
	// Two ways to drive it:
	//   - `embedded`: an in-process loop inside this app (no separate process, no secret). On in
	//     dev so the queue "just works" — schedule a publish or submit a form and the consumer
	//     fires seconds later. For horizontally-scaled prod, turn this off and use the dedicated
	//     worker loop / cron instead so N replicas don't each run a loop.
	//   - `workerSecret`: gates POST /api/internal/workers/run for platform cron / `pnpm worker`.
	//
	// APHEX_EMBEDDED_WORKER=true turns the in-process loop on in production too. That is
	// the right answer for a single-container deploy (Render, Railway, Coolify, a VPS):
	// there is no cron to configure and no second service to pay for, and without it the
	// queue silently accumulates — a scheduled publish is accepted and simply never
	// happens. Leave it off the moment you run more than one replica.
	jobs: {
		embedded: dev || isTruthy(env.APHEX_EMBEDDED_WORKER),
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

	// Uploads go straight from the browser to object storage via a presigned URL,
	// so a large file never travels through this app's server. Falls back to a
	// normal server-side upload when the storage adapter can't presign (the local
	// filesystem one can't), so it's safe to leave on.
	upload: { direct: true, maxFileSize: 200 * 1024 * 1024 },

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
