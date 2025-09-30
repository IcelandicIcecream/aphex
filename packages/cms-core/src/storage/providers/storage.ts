// Storage provider factory for creating different storage adapters
import type { StorageAdapter, StorageProvider, StorageConfig } from '../interfaces/storage.js';
import { LocalStorageAdapter } from '../adapters/local-storage-adapter.js';

/**
 * Local file system provider
 */
export class LocalStorageProvider implements StorageProvider {
  name = 'local';

  createAdapter(config: StorageConfig): StorageAdapter {
    return new LocalStorageAdapter(config);
  }
}

/**
 * Storage provider registry
 */
class StorageProviderRegistry {
  private providers = new Map<string, StorageProvider>();

  constructor() {
    // Register built-in providers
    this.register(new LocalStorageProvider());
  }

  register(provider: StorageProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  get(name: string): StorageProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }
}

// Global provider registry
export const storageProviders = new StorageProviderRegistry();

/**
 * Factory function to create storage adapters
 */
export function createStorageAdapter(
  providerName: string,
  config: StorageConfig
): StorageAdapter {
  const provider = storageProviders.get(providerName);

  if (!provider) {
    const available = storageProviders.list();
    throw new Error(
      `Unknown storage provider: ${providerName}. Available providers: ${available.join(', ')}`
    );
  }

  return provider.createAdapter(config);
}

/**
 * Convenience function for local storage
 */
export function createLocalStorageAdapter(basePath: string, options?: Partial<StorageConfig>): StorageAdapter {
  return createStorageAdapter('local', {
    basePath,
    ...options
  });
}