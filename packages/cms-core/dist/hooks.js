import { redirect } from '@sveltejs/kit';
let cmsInstances = null;
export function createCMSHook(config) {
    return async ({ event, resolve }) => {
        // Initialize CMS instances once at application startup
        if (!cmsInstances) {
            cmsInstances = {
                config,
                documentRepository: await createDocumentRepository(config),
                assetService: await createAssetService(config),
                storageAdapter: await createStorageAdapter(config),
                databaseAdapter: await createDatabaseAdapter(config),
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
                }
                catch {
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
                let auth = await cmsInstances.auth.getSession(event.request);
                // If no session, try API key
                if (!auth) {
                    auth = await cmsInstances.auth.validateApiKey(event.request);
                }
                // Require authentication for protected API routes
                const protectedApiRoutes = ['/api/documents', '/api/assets', '/api/schemas'];
                const isProtectedRoute = protectedApiRoutes.some(route => path.startsWith(route));
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
// Factory functions (these will use your existing adapters)
async function createDocumentRepository(config) {
    // Import and create based on config.database.adapter
    if (config.database.adapter === 'postgresql') {
        const { createPostgreSQLAdapter } = await import('./db/providers/database.js');
        return createPostgreSQLAdapter(config.database.connectionString);
    }
    throw new Error(`Unsupported database adapter: ${config.database.adapter}`);
}
async function createAssetService(config) {
    // Create the full asset service (storage + database)
    const storageAdapter = await createStorageAdapter(config);
    const databaseAdapter = await createDatabaseAdapter(config);
    const { AssetService: AssetServiceClass } = await import('./services/asset-service.js');
    return new AssetServiceClass(storageAdapter, databaseAdapter);
}
async function createStorageAdapter(config) {
    if (config.storage.adapter === 'local') {
        const { createLocalStorageAdapter } = await import('./storage/providers/storage.js');
        return createLocalStorageAdapter(config.storage.basePath, {
            baseUrl: config.storage.baseUrl,
            ...config.storage.config
        });
    }
    throw new Error(`Unsupported storage adapter: ${config.storage.adapter}`);
}
async function createDatabaseAdapter(config) {
    if (config.database.adapter === 'postgresql') {
        const { createPostgreSQLAdapter } = await import('./db/providers/database.js');
        return createPostgreSQLAdapter(config.database.connectionString);
    }
    throw new Error(`Unsupported database adapter: ${config.database.adapter}`);
}
