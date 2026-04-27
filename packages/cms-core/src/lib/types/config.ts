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

export type { GraphQLConfig };

export interface CMSPlugin {
	name: string;
	version: string;
	routes?: { [path: string]: (event: any) => Promise<Response> | Response };
	install: (cms: any) => Promise<void>;
	config?: { [key: string]: any };
}

/**
 * Plugin reference with options
 * Example: { name: 'my-plugin', options: { endpoint: '/api/custom' } }
 */
export interface CMSPluginReference {
	name: string;
	options?: { [key: string]: any };
}

/**
 * Plugin configuration - supports three formats:
 * 1. String reference: 'my-plugin' (loaded at runtime)
 * 2. Plugin reference with options: { name: 'my-plugin', options: {...} }
 * 3. Instantiated plugin: myPlugin({...}) (direct)
 */
export type CMSPluginConfig = string | CMSPluginReference | CMSPlugin;

export interface CMSConfig {
	schemaTypes: SchemaType[];
	database: DatabaseAdapter;
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
	 * Log level for CMS output. Defaults to 'debug' in dev, 'warn' in production.
	 */
	logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'none';
	plugins?: CMSPluginConfig[];
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
	security?: {
		/**
		 * Secret key for signing asset URLs (enables multi-tenant access without exposing API keys)
		 * Should be a long, random string (e.g., 32+ characters)
		 * Required for signed asset URLs to work
		 */
		assetSigningSecret?: string;
	};
	/**
	 * Register custom HTTP endpoints onto the Aphex API Hono app.
	 *
	 * Called once at hook init time, after built-in routes are mounted. Use
	 * standard Hono APIs to add routes — they're served via the SvelteKit
	 * catch-all alongside built-in routes.
	 *
	 * @example
	 * ```ts
	 * export default defineConfig({
	 *   api: (app) => {
	 *     app.post('/send-email', sendEmailHandler);
	 *     app.get('/invitations/:id', invitationHandler);
	 *   }
	 * });
	 * ```
	 */
	api?: (app: Hono<AphexEnv>) => void;
}
