// Aphex CMS Hooks Integration
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import type { CMSConfig } from './config.js';
import type { DocumentAdapter, DatabaseAdapter } from './db/interfaces/index.js';
import type { AssetService } from './services/asset-service.js';
import type { StorageAdapter } from './storage/interfaces/storage.js';
import type { AuthProvider, Auth } from './types.js';
import { createStorageAdapter as createStorageAdapterProvider } from './storage/providers/storage.js';
import { AssetService as AssetServiceClass } from './services/asset-service.js';

// Singleton instances - created once per application lifecycle
interface CMSInstances {
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
			const path = event.url.pathname;

			// 1. Admin UI routes - require session authentication
			if (path.startsWith('/admin')) {
				try {
					const session = await cmsInstances.auth.requireSession(event.request);
					event.locals.auth = session;
				} catch {
					throw redirect(302, config.auth?.loginUrl || '/login');
				}
			}

			// 2. API routes - accept session OR API key
			if (path.startsWith('/api/')) {
				// Skip auth routes (Better Auth handles these)
				if (path.startsWith('/api/auth')) {
					return resolve(event);
				}

				// Try session first (for admin UI making API calls)
				let auth: Auth | null = await cmsInstances.auth.getSession(event.request);

				// If no session, try API key
				if (!auth) {
					auth = await cmsInstances.auth.validateApiKey(event.request);
				}

				// Require authentication for protected API routes
				const protectedApiRoutes = ['/api/documents', '/api/assets', '/api/schemas'];
				const isProtectedRoute = protectedApiRoutes.some((route) => path.startsWith(route));

				if (isProtectedRoute && !auth) {
					return new Response(JSON.stringify({ error: 'Unauthorized' }), {
						status: 401,
						headers: { 'Content-Type': 'application/json' }
					});
				}

				// Check write permission for mutations
				if (auth && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.request.method)) {
					if (auth.type === 'api_key' && !auth.permissions.includes('write')) {
						return new Response(JSON.stringify({ error: 'Forbidden: Write permission required' }), {
							status: 403,
							headers: { 'Content-Type': 'application/json' }
						});
					}
				}

				// Make auth available in API routes
				if (auth) {
					event.locals.auth = auth;
				}
			}
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
		options: config.storage?.options
	});
}

async function createDatabaseAdapterInstance(config: CMSConfig): Promise<DatabaseAdapter> {
	// Use the provider's createAdapter method (provider is configured with its own options)
	return config.database.createAdapter();
}

// Type augmentation for SvelteKit locals
// declare global {
// 	namespace App {
// 		interface Locals {
// 			aphexCMS: CMSInstances;
// 			auth?: Auth; // Available in protected routes
// 		}
// 	}
// }
