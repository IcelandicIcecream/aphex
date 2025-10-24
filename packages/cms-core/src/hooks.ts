import type { Handle } from '@sveltejs/kit';
import type { CMSConfig } from './types/index.js';
import type { DatabaseAdapter } from './db/index.js';
import type { AssetService } from './services/asset-service.js';
import type { StorageAdapter } from './storage/interfaces/storage.js';
import type { EmailAdapter } from './email/index.js';
import type { AuthProvider } from './auth/provider.js';
import { handleAuthHook } from './auth/auth-hooks.js';
import { createStorageAdapter as createStorageAdapterProvider } from './storage/providers/storage.js';
import { AssetService as AssetServiceClass } from './services/asset-service.js';
import { createCMS, CMSEngine } from './engine.js';

// Singleton instances - created once per application lifecycle
export interface CMSInstances {
	config: CMSConfig;
	assetService: AssetService;
	storageAdapter: StorageAdapter;
	databaseAdapter: DatabaseAdapter;
	emailAdapter?: EmailAdapter | null;
	cmsEngine: CMSEngine;
	auth?: AuthProvider;
	pluginRoutes?: Map<
		string,
		{ handler: (event: any) => Promise<Response> | Response; pluginName: string }
	>;
}

let cmsInstances: CMSInstances | null = null;
let lastConfigHash: string | null = null;

// Helper to generate a simple hash of schema types for change detection
function getConfigHash(config: CMSConfig): string {
	const schemaNames = config.schemaTypes
		.map((s) => `${s.name}:${s.fields.length}:${JSON.stringify(s.fields)}`)
		.join(',');
	return schemaNames;
}

// Factory function to create the default local storage adapter
function createDefaultStorageAdapter(): StorageAdapter {
	return createStorageAdapterProvider('local', {
		basePath: './storage/assets', // Private storage - not in static/, not served in production
		baseUrl: '' // No direct URL - all access through /assets/{id}/{filename}
	});
}

export function createCMSHook(config: CMSConfig): Handle {
	return async ({ event, resolve }) => {
		// Note: In dev mode, /storage/ might be accessible via Vite dev server
		// In production, only /static/ folder is served - /storage/ is private

		const currentConfigHash = getConfigHash(config);
		const configChanged = lastConfigHash !== null && currentConfigHash !== lastConfigHash;

		// Initialize CMS instances once at application startup
		if (!cmsInstances) {
			console.log('🚀 Initializing CMS...');
			const databaseAdapter = config.database;
			// Use the storage adapter from config, or create the default local one.
			const storageAdapter = config.storage ?? createDefaultStorageAdapter();
			const emailAdapter = config.email ?? null;
			const assetService = new AssetServiceClass(storageAdapter, databaseAdapter);
			const cmsEngine = createCMS(config, databaseAdapter);

			await cmsEngine.initialize();

			// Build plugin route map (do this ONCE at startup)
			const pluginRoutes = new Map<
				string,
				{ handler: (event: any) => Promise<Response> | Response; pluginName: string }
			>();
			if (config.plugins && config.plugins.length > 0) {
				for (const plugin of config.plugins) {
					if (plugin.routes) {
						for (const [path, handler] of Object.entries(plugin.routes)) {
							pluginRoutes.set(path, { handler, pluginName: plugin.name });
						}
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
				auth: config.auth?.provider,
				pluginRoutes
			};

			// Install plugins
			if (config.plugins && config.plugins.length > 0) {
				for (const plugin of config.plugins) {
					console.log(`🔌 Installing plugin: ${plugin.name}`);
					await plugin.install(cmsInstances);
				}
			}

			lastConfigHash = currentConfigHash;
		} else if (configChanged) {
			// HMR: Config changed, re-sync schemas
			console.log('🔄 Schema types changed, re-syncing...');
			console.log('Old hash:', lastConfigHash?.substring(0, 100) + '...');
			console.log('New hash:', currentConfigHash.substring(0, 100) + '...');
			console.log(
				'Schema types being updated:',
				config.schemaTypes.map((s) => s.name)
			);
			cmsInstances.cmsEngine.updateConfig(config);
			await cmsInstances.cmsEngine.initialize();
			lastConfigHash = currentConfigHash;
			console.log('✅ Schema sync complete');
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
