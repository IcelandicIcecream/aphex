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
                databaseAdapter: await createDatabaseAdapter(config)
            };
        }
        // Inject shared CMS services into locals (reuse singleton instances)
        event.locals.aphexCMS = cmsInstances;
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
