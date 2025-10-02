import type { Handle } from '@sveltejs/kit';
import type { CMSConfig } from './config.js';
import type { DocumentAdapter, DatabaseAdapter } from './db/interfaces/index.js';
import type { AssetService } from './services/asset-service.js';
import type { StorageAdapter } from './storage/interfaces/storage.js';
import type { AuthProvider, Auth } from './types.js';
interface CMSInstances {
    config: CMSConfig;
    documentRepository: DocumentAdapter;
    assetService: AssetService;
    storageAdapter: StorageAdapter;
    databaseAdapter: DatabaseAdapter;
    auth?: AuthProvider;
}
export declare function createCMSHook(config: CMSConfig): Handle;
declare global {
    namespace App {
        interface Locals {
            aphexCMS: CMSInstances;
            auth?: Auth;
        }
    }
}
export {};
//# sourceMappingURL=hooks.d.ts.map