import type { Handle } from '@sveltejs/kit';
import type { CMSConfig } from './types/index.js';
import type { DatabaseAdapter, DocumentAdapter } from './db/index.js';
import type { AssetService } from './services/asset-service.js';
import type { StorageAdapter } from './storage/interfaces/storage.js';
import type { AuthProvider } from './auth/provider.js';
import { handleAuthHook } from './auth/auth-hooks.js';
import { createStorageAdapter as createStorageAdapterProvider } from './storage/providers/storage.js';
import { AssetService as AssetServiceClass } from './services/asset-service.js';
import { createCMS, CMSEngine } from './engine.js';

// Singleton instances - created once per application lifecycle
export interface CMSInstances {
	config: CMSConfig;
	documentRepository: DocumentAdapter;
	assetService: AssetService;
	storageAdapter: StorageAdapter;
	databaseAdapter: DatabaseAdapter;
	cmsEngine: CMSEngine;
	auth?: AuthProvider;
}

let cmsInstances: CMSInstances | null = null;

// Factory function to create the default local storage adapter
function createDefaultStorageAdapter(): StorageAdapter {
	return createStorageAdapterProvider('local', {
		basePath: './static/uploads',
		baseUrl: '/uploads'
	});
}

export function createCMSHook(config: CMSConfig): Handle {
	return async ({ event, resolve }) => {
		// Initialize CMS instances once at application startup
		if (!cmsInstances) {
			const databaseAdapter = config.database;
			// Use the storage adapter from config, or create the default local one.
			const storageAdapter = config.storage ?? createDefaultStorageAdapter();
			const assetService = new AssetServiceClass(storageAdapter, databaseAdapter);
			const cmsEngine = createCMS(config, databaseAdapter);

			await cmsEngine.initialize();

			cmsInstances = {
				config,
				databaseAdapter: databaseAdapter,
				documentRepository: databaseAdapter, // The full adapter is also the document repository
				assetService: assetService,
				storageAdapter: storageAdapter,
				cmsEngine: cmsEngine,
				auth: config.auth?.provider
			};
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

		return resolve(event);
	};
}
