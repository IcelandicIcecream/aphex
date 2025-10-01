// Dynamic config loader - enables hot-reloading of schemas
import { dev } from '$app/environment';
let cachedConfig = null;
let configLoadPromise = null;
/**
 * Dynamically loads CMS config with hot-reload support
 * This bypasses the static import to enable schema changes
 */
export async function loadCMSConfig() {
    // In development, always reload to catch schema changes
    // In production, cache the config
    if (dev) {
        // Always reload in development for hot-reloading
        cachedConfig = await reloadConfig();
    }
    else if (!cachedConfig) {
        // Only load once in production
        if (!configLoadPromise) {
            configLoadPromise = reloadConfig();
        }
        cachedConfig = await configLoadPromise;
        configLoadPromise = null;
    }
    return cachedConfig;
}
/**
 * Forces a config reload - useful for schema hot-reloading
 */
export async function reloadConfig() {
    try {
        // Import fresh schema types
        const schemaModule = await import('../schemaTypes/index.js');
        const { schemaTypes } = schemaModule;
        // Import database config
        const { DATABASE_URL } = await import('$env/static/private');
        const { defineCMSConfig } = await import('./define.js');
        // Generate simplified config from fresh schemas
        const config = defineCMSConfig({
            schemaTypes,
            database: {
                url: DATABASE_URL || 'postgresql://cms_user:cms_password@localhost:5432/cms_db'
            },
            media: {
                uploadDir: './static/uploads',
                maxFileSize: 10 * 1024 * 1024 // 10MB
            }
        });
        console.log('🔄 Config reloaded from fresh schemas:', {
            totalSchemas: schemaTypes.length,
            documents: schemaTypes.filter((type) => type.type === 'document').length,
            objects: schemaTypes.filter((type) => type.type === 'object').length
        });
        cachedConfig = config;
        return config;
    }
    catch (error) {
        console.error('❌ Failed to reload config:', error);
        throw error;
    }
}
/**
 * Invalidates the cached config - next call will reload
 */
export function invalidateConfig() {
    cachedConfig = null;
    configLoadPromise = null;
    console.log('🗑️ Config cache invalidated');
}
