import type { Handle } from '@sveltejs/kit';
import type { CMSConfig, CMSPlugin, CMSPluginConfig } from './types/index';
import type { DatabaseAdapter } from './db/index';
import type { AssetService } from './services/asset-service';
import type { StorageAdapter } from './storage/interfaces/storage';
import type { EmailAdapter } from './email/index';
import type { AuthProvider } from './auth/provider';
import { handleAuthHook } from './auth/auth-hooks';
import { createStorageAdapter as createStorageAdapterProvider } from './storage/providers/storage';
import { AssetService as AssetServiceClass } from './services/asset-service';
import { createCMS, CMSEngine } from './engine';
import { createLocalAPI, type LocalAPI } from './local-api/index';

// Singleton instances - created once per application lifecycle
export interface CMSInstances {
	config: CMSConfig;
	assetService: AssetService;
	storageAdapter: StorageAdapter;
	databaseAdapter: DatabaseAdapter;
	emailAdapter?: EmailAdapter | null;
	cmsEngine: CMSEngine;
	localAPI: LocalAPI;
	auth?: AuthProvider;
	pluginRoutes?: Map<
		string,
		{ handler: (event: any) => Promise<Response> | Response; pluginName: string }
	>;
}

let cmsInstances: CMSInstances | null = null;
let schemaError: Error | null = null;

/**
 * Check if schemas are dirty (changed via Vite HMR)
 * Vite plugin sets a global flag when schema files change
 */
function checkSchemasDirty(): boolean {
	const dirty = (global as any).__aphexSchemasDirty === true;
	if (dirty) {
		(global as any).__aphexSchemasDirty = false; // Reset the flag
	}
	return dirty;
}

// Factory function to create the default local storage adapter
function createDefaultStorageAdapter(): StorageAdapter {
	return createStorageAdapterProvider('local', {
		basePath: './storage/assets', // Private storage - not in static/, not served in production
		baseUrl: '' // No direct URL - all access through /assets/{id}/{filename}
	});
}

/**
 * Resolves a plugin configuration to an actual CMSPlugin instance
 * Supports three formats:
 * 1. String: '@aphexcms/graphql-plugin' - dynamically imports default export
 * 2. Object with name/options: { name: '@aphexcms/graphql-plugin', options: {...} }
 * 3. Already instantiated plugin: CMSPlugin object
 */
async function resolvePlugin(pluginConfig: CMSPluginConfig): Promise<CMSPlugin> {
	// Format 3: Already an instantiated plugin
	if (typeof pluginConfig === 'object' && 'install' in pluginConfig) {
		return pluginConfig;
	}

	// Format 1: String reference
	if (typeof pluginConfig === 'string') {
		try {
			const pluginModule = await import(/* @vite-ignore */ pluginConfig);
			const plugin = pluginModule.default || pluginModule;

			if (typeof plugin === 'function') {
				// If it's a factory function, call it with no options
				return plugin();
			}

			return plugin;
		} catch (error) {
			throw new Error(
				`Failed to load plugin "${pluginConfig}". Make sure it's installed: npm install ${pluginConfig}\nError: ${error}`
			);
		}
	}

	// Format 2: Object with name and options
	if (typeof pluginConfig === 'object' && 'name' in pluginConfig) {
		try {
			const pluginModule = await import(/* @vite-ignore */ pluginConfig.name);
			const pluginFactory = pluginModule.default || pluginModule;

			if (typeof pluginFactory === 'function') {
				// Call factory with options
				return pluginFactory(pluginConfig.options || {});
			}

			// If not a factory, return as-is (assuming it's already a plugin)
			return pluginFactory;
		} catch (error) {
			throw new Error(
				`Failed to load plugin "${pluginConfig.name}". Make sure it's installed: npm install ${pluginConfig.name}\nError: ${error}`
			);
		}
	}

	throw new Error(`Invalid plugin configuration: ${JSON.stringify(pluginConfig)}`);
}

export function createCMSHook(config: CMSConfig): Handle {
	return async ({ event, resolve }) => {
		// Note: In dev mode, /storage/ might be accessible via Vite dev server
		// In production, only /static/ folder is served - /storage/ is private

		// Initialize CMS instances once at application startup
		if (!cmsInstances) {
			console.log('🚀 Initializing CMS...');
			const databaseAdapter = config.database;
			// Use the storage adapter from config, or create the default local one.
			const storageAdapter = config.storage ?? createDefaultStorageAdapter();
			const emailAdapter = config.email ?? null;
			const assetService = new AssetServiceClass(storageAdapter, databaseAdapter);
			const cmsEngine = createCMS(config, databaseAdapter);

			// Initialize Local API (unified operations layer)
			const localAPI = createLocalAPI(config, databaseAdapter);

			// Initialize schemas with validation
			try {
				await cmsEngine.initialize();
			} catch (error) {
				console.error('❌ Failed to initialize CMS:', error);
				schemaError = error instanceof Error ? error : new Error(String(error));
			}

			// Build plugin route map and install plugins (do this ONCE at startup)
			const pluginRoutes = new Map<
				string,
				{ handler: (event: any) => Promise<Response> | Response; pluginName: string }
			>();

			// Resolve and install plugins
			if (config.plugins && config.plugins.length > 0) {
				for (const pluginConfig of config.plugins) {
					try {
						// Resolve plugin config to actual CMSPlugin instance (may involve dynamic import)
						const plugin = await resolvePlugin(pluginConfig);

						console.log(`🔌 Loading plugin: ${plugin.name}@${plugin.version}`);

						// Build route map before installation
						if (plugin.routes) {
							for (const [path, handler] of Object.entries(plugin.routes)) {
								pluginRoutes.set(path, { handler, pluginName: plugin.name });
							}
						}

						// Create temporary cmsInstances for installation (will be replaced below)
						const tempInstances = {
							config,
							databaseAdapter: databaseAdapter,
							assetService: assetService,
							storageAdapter: storageAdapter,
							emailAdapter: emailAdapter,
							cmsEngine: cmsEngine,
							localAPI: localAPI,
							auth: config.auth?.provider,
							pluginRoutes
						};

						// Install the plugin
						console.log(`🔌 Installing plugin: ${plugin.name}`);
						await plugin.install(tempInstances);
					} catch (error) {
						console.error(`❌ Failed to load/install plugin:`, error);
						throw error;
					}
				}
			}

			cmsInstances = {
				config,
				databaseAdapter: databaseAdapter,
				assetService: assetService,
				storageAdapter: storageAdapter,
				emailAdapter: emailAdapter,
				cmsEngine: cmsEngine,
				localAPI: localAPI,
				auth: config.auth?.provider,
				pluginRoutes
			};
		} else if (checkSchemasDirty()) {
			// HMR: Schemas changed, re-sync with database
			try {
				console.log('🔄 Syncing changed schemas to database...');
				cmsInstances.cmsEngine.updateConfig(config);
				await cmsInstances.cmsEngine.initialize();
				schemaError = null; // Clear any previous errors
				console.log('✅ Schema sync complete');
			} catch (error) {
				console.error('❌ Failed to sync schemas:', error);
				schemaError = error instanceof Error ? error : new Error(String(error));
				// Don't crash the app, just store the error
				// The old schemas in DB will remain until the error is fixed
			}
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
				config,
				cmsInstances.auth,
				cmsInstances.databaseAdapter
			);
			if (authResponse) return authResponse;
		}

		// Check if a plugin handles this route (O(1) lookup)
		if (cmsInstances.pluginRoutes && cmsInstances.pluginRoutes.size > 0) {
			const pluginRoute = cmsInstances.pluginRoutes.get(event.url.pathname);
			if (pluginRoute) {
				console.log(`🔌 Plugin ${pluginRoute.pluginName} handling route: ${event.url.pathname}`);
				return pluginRoute.handler(event);
			}
		}

		return resolve(event);
	};
}
