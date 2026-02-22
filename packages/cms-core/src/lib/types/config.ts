// types/config.ts
import type { AuthProvider } from '../auth/provider';
import type { DatabaseAdapter } from '../db/index';
import type { StorageAdapter } from '../storage/interfaces/index';
import type { EmailAdapter } from '../email/index';
import type { GraphQLConfig } from '../graphql/index';
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
 * Example: { name: '@aphexcms/graphql-plugin', options: { endpoint: '/api/graphql' } }
 */
export interface CMSPluginReference {
	name: string;
	options?: { [key: string]: any };
}

/**
 * Plugin configuration - supports three formats:
 * 1. String reference: '@aphexcms/graphql-plugin' (loaded at runtime)
 * 2. Plugin reference with options: { name: '@aphexcms/graphql-plugin', options: {...} }
 * 3. Instantiated plugin: createGraphQLPlugin({...}) (traditional, but causes large bundles)
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
	plugins?: CMSPluginConfig[];
	auth?: {
		provider: AuthProvider;
		loginUrl?: string;
	};
	security?: {
		/**
		 * Secret key for signing asset URLs (enables multi-tenant access without exposing API keys)
		 * Should be a long, random string (e.g., 32+ characters)
		 * Required for signed asset URLs to work
		 */
		assetSigningSecret?: string;
	};
}
