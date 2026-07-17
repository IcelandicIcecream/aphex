// types/config.ts
import type { Hono } from 'hono';
import type { AuthProvider } from '../auth/provider';
import type { CacheAdapter } from '../cache/index';
import type { DatabaseAdapter } from '../db/index';
import type { StorageAdapter } from '../storage/interfaces/index';
import type { EmailAdapter } from '../email/index';
import type { GraphQLConfig } from '../graphql/index';
import type { AphexEnv } from '../server/api/index';
import type { SchemaType } from './schemas';
import type { Logger } from '../utils/logger';
import type { CMSPlugin } from '../plugins/types';
import type { Auth } from './auth';
import type { PreviewPerspective } from '../preview/perspective';

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
