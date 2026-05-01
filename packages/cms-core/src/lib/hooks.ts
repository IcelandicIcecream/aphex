import type { Handle } from '@sveltejs/kit';
import type { Hono } from 'hono';
import type { CMSConfig } from './types/index';
import type { DatabaseAdapter } from './db/index';
import type { AssetService } from './services/asset-service';
import type { StorageAdapter } from './storage/interfaces/storage';
import type { EmailAdapter } from './email/index';
import type { AuthProvider } from './auth/provider';
import type { GraphQLSettings } from './graphql/index';
import { handleAuthHook } from './auth/auth-hooks';
import { cmsLogger, setLogLevel } from './utils/logger';
import { createStorageAdapter as createStorageAdapterProvider } from './storage/providers/storage';
import { AssetService as AssetServiceClass } from './services/asset-service';
import { RolesService } from './services/roles-service';
import { createCMS, CMSEngine } from './engine';
import { createLocalAPI, type LocalAPI } from './local-api/index';
import {
	createAphexApi,
	mountAphexBuiltins,
	toHonoHandler,
	type AphexEnv
} from './server/api/index';

// Singleton instances - created once per application lifecycle
export interface CMSInstances {
	config: CMSConfig;
	assetService: AssetService;
	storageAdapter: StorageAdapter;
	databaseAdapter: DatabaseAdapter;
	emailAdapter?: EmailAdapter | null;
	cmsEngine: CMSEngine;
	localAPI: LocalAPI;
	rolesService: RolesService;
	auth?: AuthProvider;
	graphqlSettings?: GraphQLSettings | null;
	apiApp: Hono<AphexEnv>;
}

let cmsInstances: CMSInstances | null = null;
let schemaError: Error | null = null;
let initPromise: Promise<void> | null = null;
let activeConfig: CMSConfig | null = null;
let configDirty = false;

/**
 * Called by the Vite HMR plugin (`@aphexcms/cms-core/vite`) when schema
 * files or `aphex.config.ts` change. Replaces the captured config with the
 * freshly re-evaluated module and marks instances for re-initialization on
 * the next request — no Vite dev-server restart required.
 *
 * Module-level state means the Vite plugin and the running SvelteKit hook
 * share the same cms-core instance through Vite's module graph, so this
 * setter mutates the same `activeConfig` the hook reads on each request.
 */
export function __notifyAphexConfigChanged(newConfig: CMSConfig): void {
	activeConfig = newConfig;
	configDirty = true;
}

function checkSchemasDirty(): boolean {
	if (!configDirty) return false;
	configDirty = false;
	return true;
}

// Factory function to create the default local storage adapter
function createDefaultStorageAdapter(): StorageAdapter {
	return createStorageAdapterProvider('local', {
		basePath: './storage/assets', // Private storage - not in static/, not served in production
		baseUrl: '' // No direct URL - all access through /assets/{id}/{filename}
	});
}

export function createCMSHook(config: CMSConfig): Handle {
	if (!config) {
		throw new Error(
			'[CMS] createCMSHook received an undefined config. ' +
				'If this happens during HMR, the config module may not have re-executed yet.'
		);
	}
	// Apply log level from config (if provided)
	if (config.logLevel) setLogLevel(config.logLevel);

	// Stash the config in module scope so the HMR plugin can replace it via
	// __notifyAphexConfigChanged() without going through this factory again.
	activeConfig = config;

	return async ({ event, resolve }) => {
		// Use the latest config that the HMR plugin handed us; falls back to
		// the one captured at hook construction time.
		const currentConfig = activeConfig ?? config;
		// Note: In dev mode, /storage/ might be accessible via Vite dev server
		// In production, only /static/ folder is served - /storage/ is private

		// Initialize CMS instances once at application startup
		// Use a promise lock to prevent concurrent requests from racing initialization.
		// Also reset before the init check so a schema HMR or a sticky schemaError
		// falls through into fresh init on THIS request (not next one) — otherwise
		// locals.aphexCMS would be null for the requesting handler.
		if (cmsInstances && (checkSchemasDirty() || schemaError)) {
			cmsLogger.info('[CMS]', 'Schema change detected, re-initializing...');
			if (cmsInstances.config.cache) {
				cmsInstances.config.cache.flush();
			}
			cmsInstances = null;
			schemaError = null;
			initPromise = null;
		}
		if (initPromise) {
			await initPromise;
		}
		if (!cmsInstances) {
			let resolveInit: () => void;
			initPromise = new Promise<void>((r) => (resolveInit = r));

			cmsLogger.info('[CMS]', 'Initializing...');
			const databaseAdapter = currentConfig.database;
			// Use the storage adapter from config, or create the default local one.
			const storageAdapter = currentConfig.storage ?? createDefaultStorageAdapter();
			const emailAdapter = currentConfig.email ?? null;
			const assetService = new AssetServiceClass(storageAdapter, databaseAdapter);
			const cmsEngine = createCMS(currentConfig, databaseAdapter);
			const rolesService = new RolesService(databaseAdapter, currentConfig.cache ?? null);

			// Initialize Local API (unified operations layer)
			const localAPI = createLocalAPI(currentConfig, databaseAdapter);

			// Build the Hono API app shell. User middleware/overrides register
			// FIRST (so they sit ahead of built-ins in the chain), then we mount
			// the built-in routes, then GraphQL.
			const apiApp = createAphexApi();
			currentConfig.api?.(apiApp);
			mountAphexBuiltins(apiApp);

			// Initialize schemas with validation
			try {
				await cmsEngine.initialize();
			} catch (error) {
				cmsLogger.error('[CMS]', 'Failed to initialize:', error);
				schemaError = error instanceof Error ? error : new Error(String(error));
			}

			// Initialize built-in GraphQL (enabled by default, opt-out with graphql: false)
			let graphqlSettings: GraphQLSettings | null = null;

			if (currentConfig.graphql !== false) {
				try {
					const { createGraphQLHandler } = await import('./graphql/index');
					const graphqlConfig =
						typeof currentConfig.graphql === 'object' ? currentConfig.graphql : {};
					const result = await createGraphQLHandler(
						{
							config: currentConfig,
							databaseAdapter,
							assetService,
							storageAdapter,
							emailAdapter,
							cmsEngine,
							localAPI,
							rolesService,
							auth: currentConfig.auth?.provider,
							apiApp
						},
						currentConfig.schemaTypes,
						graphqlConfig
					);

					// Register GraphQL directly on the Hono app. The Yoga handler
					// internally distinguishes GET (GraphiQL UI) from POST (queries),
					// so we mount with `app.all()` and let it route by method.
					//
					// Path is normalized to be relative to the `/api` basePath:
					// e.g. config path "/api/graphql" → mount at "/graphql".
					const rawPath = graphqlConfig.path ?? '/api/graphql';
					const fullPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
					const honoPath = fullPath.startsWith('/api')
						? fullPath.slice('/api'.length) || '/'
						: fullPath;
					apiApp.all(honoPath, toHonoHandler(result.handler));
					graphqlSettings = result.settings;
				} catch (error) {
					cmsLogger.error('[CMS]', 'Failed to initialize GraphQL:', error);
					// Non-fatal: CMS works without GraphQL
				}
			}

			cmsInstances = {
				config: currentConfig,
				databaseAdapter: databaseAdapter,
				assetService: assetService,
				storageAdapter: storageAdapter,
				emailAdapter: emailAdapter,
				cmsEngine: cmsEngine,
				localAPI: localAPI,
				rolesService,
				auth: currentConfig.auth?.provider,
				graphqlSettings,
				apiApp
			};

			resolveInit!();
		}

		// Attach schema error to instances so it can be accessed in load functions
		if (cmsInstances) {
			(cmsInstances as any).schemaError = schemaError;
		}

		// Inject shared CMS services into locals (reuse singleton instances)
		event.locals.aphexCMS = cmsInstances;

		// Auth protection if configured
		if (cmsInstances.auth) {
			const authResponse = await handleAuthHook(
				event,
				currentConfig,
				cmsInstances.auth,
				cmsInstances.databaseAdapter,
				cmsInstances.rolesService
			);
			if (authResponse) return authResponse;
		}

		return resolve(event);
	};
}
