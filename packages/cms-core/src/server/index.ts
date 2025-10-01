// Aphex CMS Core - Server-side exports
// These require Node.js and should NOT be imported client-side

// Configuration system
export { createCMSConfig } from '../config.js';
export type { CMSConfig, CMSPlugin } from '../config.js';

// Auth types
export type { AuthProvider, SessionAuth, ApiKeyAuth, Auth } from '../types.js';

// Hooks integration (SvelteKit server hooks)
export { createCMSHook } from '../hooks.js';

// Database schema (Drizzle ORM)
export * from '../db/schema.js';
export type { Document, NewDocument, Asset, NewAsset, SchemaType as SchemaTypeRecord, NewSchemaType } from '../db/schema.js';

// Database adapters and interfaces
export * from '../db/index.js';
export * from '../db/interfaces/index.js';
export * from '../db/adapters/index.js';
export * from '../db/providers/database.js';

// Storage adapters and interfaces
export * from '../storage/index.js';
export * from '../storage/interfaces/index.js';
export * from '../storage/adapters/index.js';
export * from '../storage/providers/storage.js';

// Services (includes sharp for image processing)
export * from '../services/index.js';
export { AssetService } from '../services/asset-service.js';

// API Route handlers (for re-exporting in your app's API routes)
// Re-export from routes-exports to avoid .js extension issues in workspace
export * from '../routes-exports';

// Route factory functions (for custom implementations)
export { createSchemaByTypeHandler } from '../routes/schemas-by-type.js';

// Schema utilities
export * from '../schema-utils/index.js';

// Content hash utilities (server-side)
export { createHashForPublishing } from '../utils/content-hash.js';
