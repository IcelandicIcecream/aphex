// Aphex CMS Hooks Integration
import type { Handle } from '@sveltejs/kit';
import type { CMSConfig } from './config.js';

export function createCMSHook(config: CMSConfig): Handle {
  return async ({ event, resolve }) => {
    // Inject CMS services into locals
    event.locals.aphexCMS = {
      config,
      // These will be created from the configuration
      documentRepository: await createDocumentRepository(config),
      assetService: await createAssetService(config),
      storageAdapter: await createStorageAdapter(config),
      databaseAdapter: await createDatabaseAdapter(config)
    };

    return resolve(event);
  };
}

// Factory functions (these will use your existing adapters)
async function createDocumentRepository(config: CMSConfig) {
  // Import and create based on config.database.adapter
  if (config.database.adapter === 'postgresql') {
    const { createPostgreSQLAdapter } = await import('./db/providers/database.js');
    return createPostgreSQLAdapter(config.database.connectionString!);
  }
  throw new Error(`Unsupported database adapter: ${config.database.adapter}`);
}

async function createAssetService(config: CMSConfig) {
  // Create the full asset service (storage + database)
  const storageAdapter = await createStorageAdapter(config);
  const databaseAdapter = await createDatabaseAdapter(config);
  
  const { AssetService } = await import('./services/asset-service.js');
  return new AssetService(storageAdapter, databaseAdapter);
}

async function createStorageAdapter(config: CMSConfig) {
  if (config.storage.adapter === 'local') {
    const { createLocalStorageAdapter } = await import('./storage/providers/storage.js');
    return createLocalStorageAdapter(config.storage.basePath!, {
      baseUrl: config.storage.baseUrl!,
      ...config.storage.config
    });
  }
  throw new Error(`Unsupported storage adapter: ${config.storage.adapter}`);
}

async function createDatabaseAdapter(config: CMSConfig) {
  if (config.database.adapter === 'postgresql') {
    const { createPostgreSQLAdapter } = await import('./db/providers/database.js');
    return createPostgreSQLAdapter(config.database.connectionString!);
  }
  throw new Error(`Unsupported database adapter: ${config.database.adapter}`);
}

// Type augmentation for SvelteKit locals
declare global {
  namespace App {
    interface Locals {
      aphexCMS: {
        config: CMSConfig;
        documentRepository: any;
        assetService: any;
        storageAdapter: any;
        databaseAdapter: any;
      };
    }
  }
}