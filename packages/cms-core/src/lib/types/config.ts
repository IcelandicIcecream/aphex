// types/config.ts
import type { Hono } from 'hono';
import type { AuthProvider } from '../auth/provider';
import type { CacheAdapter } from '../cache/index';
import type { DatabaseAdapter } from '../db/index';
import type { StorageAdapter } from '../storage/interfaces/index';
import type { EmailAdapter } from '../email/index';
import type { AIProviderAdapter } from '../ai/index';
import type { GraphQLConfig } from '../graphql/index';
import type { AphexEnv } from '../server/api/index';
import type { SchemaType } from './schemas';
import type { Logger } from '../utils/logger';
import type { CMSPlugin } from '../plugins/types';
import type { Auth } from './auth';
import type { PreviewPerspective } from '../preview/perspective';
import type { JobHandlerMap } from '../jobs/types';

export type { GraphQLConfig };

export interface CMSConfig {
	schemaTypes: SchemaType[];
	database: DatabaseAdapter;
	/**
	 * Build-time plugins. Each contributes typed "parts" (schemas, server routes,
	 * document actions, admin tools, field components, capabilities). Schema parts
	 * are merged into `schemaTypes` at config time; the rest are indexed by a part
	 * resolver on `event.locals.aphexCMS.partResolver`. See the plugins module.
	 */
	plugins?: CMSPlugin[];
	storage?: StorageAdapter | null;
	email?: EmailAdapter | null;
	/** Model backend for the in-admin agent. Omit to leave the agent panel disabled. */
	aiProvider?: AIProviderAdapter | null;
	/**
	 * Default provider-specific model id used by `/api/agent/chat`, e.g.
	 * `claude-sonnet-4-5` (Anthropic) or `gpt-4.1` (OpenAI/OpenRouter). A request may
	 * override it per-call. Required when `aiProvider` is set — the route 501s without it.
	 */
	agentModel?: string;
	customization?: {
		branding?: {
			title?: string;
			logo?: string;
			favicon?: string;
		};
		theme?: {
			colors?: Record<string, string>;
			fonts?: Record<string, string>;
		};
	};
	/**
	 * GraphQL API configuration.
	 * - `true` or `undefined`: enabled with defaults (endpoint: /api/graphql, GraphiQL: on)
	 * - `false`: disabled entirely
	 * - `GraphQLConfig` object: enabled with custom options
	 */
	graphql?: boolean | GraphQLConfig;
	/**
	 * Log level for the built-in console logger. Defaults to 'debug' in dev, 'warn' in production.
	 * Ignored when a custom `logger` is provided.
	 */
	logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'none';
	/**
	 * Custom logger instance (e.g. pino). Must implement debug/info/warn/error.
	 * When provided, replaces the built-in console logger entirely.
	 *
	 * @example
	 * ```ts
	 * import pino from 'pino';
	 * export default createCMSConfig({
	 *   logger: pino({ level: 'info' }),
	 * });
	 * ```
	 */
	logger?: Logger;
	auth?: {
		provider: AuthProvider;
		loginUrl?: string;
	};
	/**
	 * Cache adapter for published data queries.
	 * - `undefined` or `null`: no caching (default)
	 * - `CacheAdapter` instance: caches published-perspective reads, invalidated on publish/unpublish
	 */
	cache?: CacheAdapter | null;
	/**
	 * Version history configuration.
	 * - `maxVersions`: Maximum versions to keep per document (rolling). Default: 25. Set to 0 for unlimited.
	 */
	versioning?: {
		maxVersions?: number;
	};
	/**
	 * Background job execution (the DB-backed job queue). Jobs are scheduled via the
	 * database adapter (`scheduleJob`) and driven by `runDueJobs`, which the protected
	 * worker endpoint (`POST /api/internal/workers/run`) and any self-hosted worker loop
	 * both call. Events and scheduling work without this; only *executing* jobs needs it.
	 */
	jobs?: {
		/**
		 * Map of job `type` → handler. A claimed job whose type has no handler is
		 * dead-lettered (an unknown type can never become runnable).
		 */
		handlers?: JobHandlerMap;
		/**
		 * Shared secret authorizing `POST /api/internal/workers/run`
		 * (`Authorization: Bearer <secret>`). Machine-to-machine — platform cron or a
		 * self-hosted worker loop, NOT the user capability system. When unset the endpoint
		 * is disabled (404), so it's never an unauthenticated surface by default; jobs can
		 * still be scheduled, they just won't run until a secret (and a driver) exist.
		 */
		workerSecret?: string;
		/** Max jobs claimed per worker run. Default 10. */
		batchSize?: number;
		/** Lease duration (ms) per claimed job before it's reclaimable. Default 30000. */
		leaseMs?: number;
		/**
		 * Max outbox rows the relay drains per worker run (events fanned out to consumer
		 * delivery jobs). Runs at the top of the same tick as job execution. Default 100 —
		 * fan-out is cheap (a few inserts), so it can clear more per pass than it executes.
		 */
		relayBatchSize?: number;
		/**
		 * Run an in-process job loop inside the app itself — no separate worker process, no
		 * `workerSecret`, no cron. It calls `runJobsBatch` directly on `embeddedIntervalMs`, so
		 * scheduled publishes and event consumers "just work" the moment the app is running. Ideal
		 * for local dev and single-instance self-hosting; for horizontally-scaled prod prefer the
		 * dedicated worker loop / platform cron so N app replicas don't each run a loop. Ticks never
		 * overlap (a slow tick is skipped, not stacked). Default off.
		 */
		embedded?: boolean;
		/** Interval (ms) between embedded loop ticks when `embedded` is on. Default 3000. */
		embeddedIntervalMs?: number;
	};
	/**
	 * Live preview configuration.
	 * - `stega`: Enable stega encoding in preview data pushes so field overlays work
	 *   automatically. Default: true.
	 * - `resolvePerspective`: Decide the read perspective per request. The CMS hook
	 *   runs it and stores the result on `locals.previewPerspective`, which site loads
	 *   inherit via a preview-aware context (see `siteContext`). Defaults to
	 *   `getPreviewPerspective` — `'draft'` only for an authenticated session with
	 *   `?aphex-preview`; `'published'` otherwise. Override to change the signal
	 *   (e.g. a preview token, a different query param, or per-role rules).
	 */
	preview?: {
		stega?: boolean;
		resolvePerspective?: (args: { auth?: Auth; url: URL }) => PreviewPerspective;
	};
	security?: {
		/**
		 * Secret key for signing asset URLs (enables multi-tenant access without exposing API keys)
		 * Should be a long, random string (e.g., 32+ characters)
		 * Required for signed asset URLs to work
		 */
		assetSigningSecret?: string;
		/**
		 * Key used to encrypt plugin secret settings at rest (AES-256-GCM). A long,
		 * random string (32+ chars); keep it out of source and stable across deploys —
		 * rotating it makes existing encrypted secrets undecryptable. When absent,
		 * `type: 'secret'` settings fields are read-only and flagged in the UI (fail
		 * safe — core never stores a secret as plaintext).
		 */
		secretEncryptionKey?: string;
	};
	/**
	 * Register custom HTTP endpoints / middleware onto the Aphex API Hono app.
	 *
	 * Called once at hook init time, BEFORE built-in routes are mounted.
	 * Hono is registration-order-strict, so registering first means:
	 *   - `app.use(path, mw)` actually wraps subsequent built-in handlers
	 *   - `app.METHOD(path, handler)` overrides a built-in route at that path
	 *     (Hono is first-match-wins).
	 *
	 * @example
	 * ```ts
	 * export default defineConfig({
	 *   api: (app) => {
	 *     // Add a new endpoint
	 *     app.post('/send-email', sendEmailHandler);
	 *
	 *     // Wrap a built-in endpoint with side effects
	 *     app.use('/organizations/invitations', async (c, next) => {
	 *       await next();
	 *       if (c.res.status === 201) sendInviteEmail(...);
	 *     });
	 *   }
	 * });
	 * ```
	 */
	api?: (app: Hono<AphexEnv>) => void;
}
