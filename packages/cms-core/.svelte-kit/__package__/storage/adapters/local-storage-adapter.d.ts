import type { StorageAdapter, StorageConfig, UploadFileData, StorageFile } from '../interfaces/storage.js';
/**
 * Pure local file system storage adapter - only handles files
 */
export declare class LocalStorageAdapter implements StorageAdapter {
    private config;
    constructor(config: StorageConfig);
    /**
     * Generate unique filename preserving original name
     */
    private generateUniqueFilename;
    /**
     * Parse filename into name and extension
     */
    private parseFilename;
    /**
     * Check if file exists on disk
     */
    private fileExistsOnDisk;
    /**
     * Store a file and return storage info
     */
    store(data: UploadFileData): Promise<StorageFile>;
    /**
     * Delete a file from storage
     */
    delete(path: string): Promise<boolean>;
    /**
     * Check if file exists
     */
    exists(path: string): Promise<boolean>;
    /**
     * Get public URL for a file path
     */
    getUrl(path: string): string;
    /**
     * Get storage information
     */
    getStorageInfo(): Promise<{
        totalSize: number;
        availableSpace?: number;
    }>;
    /**
     * Health check - test if we can write to storage
     */
    isHealthy(): Promise<boolean>;
}
//# sourceMappingURL=local-storage-adapter.d.ts.map