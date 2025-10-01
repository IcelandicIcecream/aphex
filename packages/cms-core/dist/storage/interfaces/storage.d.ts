export interface StorageFile {
    path: string;
    url: string;
    size: number;
}
export interface UploadFileData {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    size: number;
}
export interface StorageConfig {
    basePath: string;
    baseUrl?: string;
    maxFileSize?: number;
    allowedTypes?: string[];
    options?: {
        [key: string]: any;
    };
}
/**
 * Pure storage interface - only handles file operations
 * No database operations - completely agnostic
 */
export interface StorageAdapter {
    store(data: UploadFileData): Promise<StorageFile>;
    delete(path: string): Promise<boolean>;
    exists(path: string): Promise<boolean>;
    getUrl(path: string): string;
    getStorageInfo(): Promise<{
        totalSize: number;
        availableSpace?: number;
    }>;
    isHealthy(): Promise<boolean>;
    connect?(): Promise<void>;
    disconnect?(): Promise<void>;
}
/**
 * Storage provider factory interface
 */
export interface StorageProvider {
    name: string;
    createAdapter(config: StorageConfig): StorageAdapter;
}
//# sourceMappingURL=storage.d.ts.map