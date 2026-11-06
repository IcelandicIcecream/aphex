// Aphex CMS Configuration
// This file defines the CMS configuration for your application
import { env } from '$env/dynamic/private';
import { building, dev } from '$app/environment';
import {
	createCMSConfig,
	createStorageAdapter,
	InMemoryCacheAdapter,
	type StorageAdapter
} from '@aphexcms/cms-core/server';
import { createOpenAIAdapter } from '@aphexcms/ai-openai';
import { aphexAuth } from '@aphexcms/auth';
import { createMailpitAdapter } from '@aphexcms/nodemailer-adapter';
import { pgConnectionUrl, postgresAdapter } from '@aphexcms/postgresql-adapter';
import { pgliteAdapter } from '@aphexcms/postgresql-adapter/pglite';
import { resendAdapter } from '@aphexcms/resend-adapter';
import { sqliteAdapter } from '@aphexcms/sqlite-adapter';
import { s3Storage } from '@aphexcms/storage-s3';
import { schemaTypes } from './src/lib/schemaTypes/index.js';
// Single plugin entrypoint. Declared once in a client-safe file (the admin imports
// the same array for component parts); the server ingests its schema/route parts here.
import { plugins } from './src/lib/plugins.js';
import { authOptions, bootstrapPolicy } from './src/lib/server/auth/auth.config';
import { SlowQueryLogger } from './src/lib/server/db/query-logger';
import { emailConfig, reportEmailStatus } from './src/lib/server/email/config';
import { registerInvitationEmailHook } from './src/lib/server/email/invitation-hook';

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

/** Comma-separated env var to a clean list. */
function csv(value: string | undefined): string[] {
	return (value ?? '')
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean);
}

/**
 * Studio keeps every driver behind APHEX_DATABASE so it can exercise them all. An app
 * on one database replaces this with a single `sqliteAdapter({ ... })` in the config.
 */
function selectDatabase() {
	const shared = {
		// On by default. Opt out in production with APHEX_DB_AUTO_MIGRATE=false and run
		// migrations as a separate step.
		autoMigrate: !['false', '0', 'no', 'off'].includes(
			(env.APHEX_DB_AUTO_MIGRATE ?? '').toLowerCase()
		),
		logger: env.ENABLE_QUERY_LOG === 'true' ? new SlowQueryLogger() : undefined,
		multiTenancy: { enableRLS: true, enableHierarchy: true }
	};

	switch (env.APHEX_DATABASE?.toLowerCase()) {
		case 'sqlite':
			return sqliteAdapter({
				...shared,
				url: env.APHEX_SQLITE_URL || 'file:.aphex/studio.db',
				authToken: env.DATABASE_AUTH_TOKEN
			});
		case 'pglite':
			return pgliteAdapter({
				...shared,
				dataDir: env.APHEX_PGLITE_DIR || '.aphex/pgdata'
			});
		default:
			return postgresAdapter({
				...shared,
				// Throws when nothing is set, which is only an error outside the build.
				connectionString: building ? undefined : pgConnectionUrl(env)
			});
	}
}

/**
 * S3-compatible object storage (R2, AWS S3, MinIO, B2, …), or local disk without one.
 * `S3_*` wins over the older `R2_*` spelling, per variable.
 */
function selectStorage(): StorageAdapter {
	const read = (name: string) => env[`S3_${name}`] || env[`R2_${name}`] || undefined;
	const bucket = read('BUCKET');
	const endpoint = read('ENDPOINT');
	const accessKeyId = read('ACCESS_KEY_ID');
	const secretAccessKey = read('SECRET_ACCESS_KEY');

	if (bucket && endpoint && accessKeyId && secretAccessKey) {
		return s3Storage({
			bucket,
			endpoint,
			accessKeyId,
			secretAccessKey,
			publicUrl: read('PUBLIC_URL') || '',
			baseUrl: read('CDN_URL'),
			// Leave unset for R2 and MinIO. AWS needs the bucket's real region, because it is
			// part of the request signature: the default `auto` fails SignatureDoesNotMatch.
			region: read('REGION')
		});
	}

	// Falling back is silent by nature, and one typo'd variable lands uploads on a disk
	// the next deploy discards, so say so when the bucket config is only partly there.
	if (bucket || endpoint || accessKeyId || secretAccessKey) {
		console.warn(
			'[aphex] Object storage is partially configured, so uploads are going to local disk, ' +
				'where they do not survive a redeploy. Set S3_BUCKET, S3_ENDPOINT, S3_ACCESS_KEY_ID ' +
				'and S3_SECRET_ACCESS_KEY to use the bucket.'
		);
	}

	return createStorageAdapter('local', {
		// Deliberately outside `static/`: anything there is public by URL, which would
		// bypass the `private: true` check that only `/media/:id/:filename` enforces.
		// Containers should point APHEX_UPLOADS_DIR at a mounted volume.
		basePath: env.APHEX_UPLOADS_DIR || './uploads',
		// Older asset rows carry these prefixes; rebase them without serving from them.
		options: { legacyBasePaths: ['./static/uploads', './uploads'] },
		// Unused: every asset URL is built as `/media/:id/:filename`.
		baseUrl: '/uploads'
	});
}

// Dev → Mailpit, production → Resend, and no key means no email rather than a crash.
// The build pass gets the Mailpit stub, which only connects when it sends.
const email =
	dev || building
		? createMailpitAdapter()
		: env.RESEND_API_KEY
			? resendAdapter({ apiKey: env.RESEND_API_KEY })
			: null;
if (!building) reportEmailStatus(email);

const authUrl = env.AUTH_URL || env.BETTER_AUTH_URL;

export default createCMSConfig({
	schemaTypes,
	plugins,

	database: selectDatabase(),
	storage: selectStorage(),
	email,
	// Set to null to disable caching.
	cache: new InMemoryCacheAdapter({ maxSize: 5000 }),

	// In-admin agent model backend. Points at a local OpenAI-compatible router
	// (AGENT_BASE_URL) for manual testing of POST /api/agent/chat — swap for a real
	// createOpenAIAdapter/createAnthropicAdapter/createOllamaCompatAdapter once a
	// provider is chosen. Unset (both undefined/null) when AGENT_BASE_URL isn't set, so
	// the route 404s rather than existing half-configured.
	aiProvider: env.AGENT_BASE_URL
		? createOpenAIAdapter({ apiKey: env.AGENT_API_KEY || 'local', baseURL: env.AGENT_BASE_URL })
		: null,
	agentModel: env.AGENT_BASE_URL ? (env.AGENT_MODEL ?? 'gpt-5.4-mini') : undefined,

	auth: aphexAuth({
		secret: env.AUTH_SECRET || env.BETTER_AUTH_SECRET,
		baseURL: authUrl,
		// Origins allowed to make cross-origin auth requests. Without this, cookie-auth
		// mutations are reachable from any site a signed-in admin visits.
		trustedOrigins: csv(env.AUTH_TRUSTED_ORIGINS || authUrl),
		// Rate limiting is per-IP, so the address has to survive your proxy. Railway,
		// Render, Fly and Coolify are detected automatically. Only name a header your
		// proxy overwrites: otherwise a caller can pick their own IP and skip the limit.
		ipAddressHeaders: csv(env.AUTH_IP_ADDRESS_HEADERS).map((header) => header.toLowerCase()),
		email: emailConfig,
		options: authOptions,
		bootstrap: bootstrapPolicy,
		appName: 'Aphex CMS',
		loginUrl: '/login' // Studio keeps its own login page
	}),

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
