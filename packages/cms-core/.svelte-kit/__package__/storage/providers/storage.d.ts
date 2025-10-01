import type { StorageAdapter, StorageProvider, StorageConfig } from '../interfaces/storage.js';
/**
 * Local file system provider
 */
export declare class LocalStorageProvider implements StorageProvider {
    name: string;
    createAdapter(config: StorageConfig): StorageAdapter;
}
/**
 * Storage provider registry
 */
declare class StorageProviderRegistry {
    private providers;
    constructor();
    register(provider: StorageProvider): void;
    get(name: string): StorageProvider | undefined;
    list(): string[];
}
export declare const storageProviders: StorageProviderRegistry;
/**
 * Factory function to create storage adapters
 */
export declare function createStorageAdapter(providerName: string, config: StorageConfig): StorageAdapter;
/**
 * Convenience function for local storage
 */
export declare function createLocalStorageAdapter(basePath: string, options?: Partial<StorageConfig>): StorageAdapter;
export {};
//# sourceMappingURL=storage.d.ts.map