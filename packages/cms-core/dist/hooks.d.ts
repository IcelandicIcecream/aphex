import type { Handle } from '@sveltejs/kit';
import type { CMSConfig } from './config.js';
import type { DocumentAdapter, DatabaseAdapter } from './db/interfaces/index.js';
import type { AssetService } from './services/asset-service.js';
import type { StorageAdapter } from './storage/interfaces/storage.js';
interface CMSInstances {
    config: CMSConfig;
    documentRepository: DocumentAdapter;
    assetService: AssetService;
    storageAdapter: StorageAdapter;
    databaseAdapter: DatabaseAdapter;
}
export declare function createCMSHook(config: CMSConfig): Handle;
declare global {
    namespace App {
        interface Locals {
            aphexCMS: CMSInstances;
        }
    }
}
export {};
//# sourceMappingURL=hooks.d.ts.map