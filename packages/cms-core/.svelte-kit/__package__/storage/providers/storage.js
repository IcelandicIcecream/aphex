import { LocalStorageAdapter } from '../adapters/local-storage-adapter.js';
/**
 * Local file system provider
 */
export class LocalStorageProvider {
    name = 'local';
    createAdapter(config) {
        return new LocalStorageAdapter(config);
    }
}
/**
 * Storage provider registry
 */
class StorageProviderRegistry {
    providers = new Map();
    constructor() {
        // Register built-in providers
        this.register(new LocalStorageProvider());
    }
    register(provider) {
        this.providers.set(provider.name.toLowerCase(), provider);
    }
    get(name) {
        return this.providers.get(name.toLowerCase());
    }
    list() {
        return Array.from(this.providers.keys());
    }
}
// Global provider registry
export const storageProviders = new StorageProviderRegistry();
/**
 * Factory function to create storage adapters
 */
export function createStorageAdapter(providerName, config) {
    const provider = storageProviders.get(providerName);
    if (!provider) {
        const available = storageProviders.list();
        throw new Error(`Unknown storage provider: ${providerName}. Available providers: ${available.join(', ')}`);
    }
    return provider.createAdapter(config);
}
/**
 * Convenience function for local storage
 */
export function createLocalStorageAdapter(basePath, options) {
    return createStorageAdapter('local', {
        basePath,
        ...options
    });
}
