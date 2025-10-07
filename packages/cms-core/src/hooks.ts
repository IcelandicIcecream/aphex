// Aphex CMS Hooks Integration
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import type { CMSConfig, Auth } from './types/index.js';
import type { DocumentAdapter, DatabaseAdapter } from './db/interfaces/index.js';
import type { AssetService } from './services/asset-service.js';
import type { StorageAdapter } from './storage/interfaces/storage.js';
import type { AuthProvider } from './auth/provider.js';
import { handleAuthHook } from './auth/auth-hooks.js';
import { createStorageAdapter as createStorageAdapterProvider } from './storage/providers/storage.js';
import { AssetService as AssetServiceClass } from './services/asset-service.js';

// Singleton instances - created once per application lifecycle
export interface CMSInstances {
	config: CMSConfig;
	documentRepository: DocumentAdapter;
	assetService: AssetService;
	storageAdapter: StorageAdapter;
	databaseAdapter: DatabaseAdapter;
	auth?: AuthProvider;
}

let cmsInstances: CMSInstances | null = null;

export function createCMSHook(config: CMSConfig): Handle {
	return async ({ event, resolve }) => {
		// Initialize CMS instances once at application startup
		if (!cmsInstances) {
			cmsInstances = {
				config,
				documentRepository: await createDocumentRepositoryInstance(config),
				assetService: await createAssetServiceInstance(config),
				storageAdapter: await createStorageAdapterInstance(config),
				databaseAdapter: await createDatabaseAdapterInstance(config),
				auth: config.auth?.provider
			};
		}

		// Inject shared CMS services into locals (reuse singleton instances)
		event.locals.aphexCMS = cmsInstances;

		// Auth protection if configured
		if (cmsInstances.auth) {
			const authResponse = await handleAuthHook(event, config, cmsInstances.auth);
			if (authResponse) return authResponse;
		}

		return resolve(event);
	};
}

// Factory functions - use provider directly
async function createDocumentRepositoryInstance(config: CMSConfig): Promise<DocumentAdapter> {
	// Use the provider's createAdapter method (provider is configured with its own options)
	return config.database.createAdapter();
}

async function createAssetServiceInstance(config: CMSConfig): Promise<AssetService> {
	// Create the full asset service (storage + database)
	const storageAdapter = await createStorageAdapterInstance(config);
	const databaseAdapter = await createDatabaseAdapterInstance(config);
	return new AssetServiceClass(storageAdapter, databaseAdapter);
}

async function createStorageAdapterInstance(config: CMSConfig): Promise<StorageAdapter> {
	// If adapter is already an instance (from helper like r2Storage()), use it directly
	if (config.storage?.adapter && typeof config.storage.adapter === 'object') {
		return config.storage.adapter;
	}

	// Otherwise, use local storage with defaults
	return createStorageAdapterProvider('local', {
		basePath: config.storage?.basePath || './static/uploads',
		baseUrl: config.storage?.baseUrl || '/uploads',
		options: config.storage?.opts
	});
}

async function createDatabaseAdapterInstance(config: CMSConfig): Promise<DatabaseAdapter> {
	// Use the provider's createAdapter method (provider is configured with its own options)
	return config.database.createAdapter();
}
