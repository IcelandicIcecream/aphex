// CMS service configuration and instances
import { createLocalStorageAdapter } from '../storage/providers/storage.js';
import { createPostgreSQLAdapter } from '../db/providers/database.js';
import { AssetService } from './asset-service.js';
import { join } from 'path';
import { DATABASE_URL } from '$env/static/private';

// Storage configuration
const STORAGE_BASE_PATH = join(process.cwd(), 'static', 'uploads');
const STORAGE_BASE_URL = '/uploads';

// Create storage adapter (pure file operations)
export const storageAdapter = createLocalStorageAdapter(STORAGE_BASE_PATH, {
  baseUrl: STORAGE_BASE_URL,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'image/gif',
    'image/avif',
    'image/svg+xml',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
});

// Create database adapter (pure data operations)
export const databaseAdapter = createPostgreSQLAdapter(DATABASE_URL);

// Create asset service (orchestrates storage + database)
export const assetService = new AssetService(storageAdapter, databaseAdapter);

// Re-export types for convenience
export type { Asset } from '$lib/server/db/schema.js';
export type { 
  AssetUploadData,
  AssetFilters
} from './asset-service.js';