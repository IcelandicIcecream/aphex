// Aphex CMS Core - Server-side exports
// These require Node.js and should NOT be imported client-side

// Export all core types from the new central location
export * from '../types/index.js';

// Configuration system
export { createCMSConfig } from '../config.js';

// Hooks integration (SvelteKit server hooks)
export { createCMSHook, type CMSInstances } from '../hooks.js';

// Database interfaces (no longer export registry or adapters - use adapter packages)
export * from '../db/interfaces/index.js';

// Storage adapters and interfaces
export * from '../storage/index.js';
export * from '../storage/interfaces/index.js';
export * from '../storage/providers/storage.js';

// Services (includes sharp for image processing)
export * from '../services/index.js';
export { AssetService } from '../services/asset-service.js';

// API Route handlers (for re-exporting in your app's API routes)
// Re-export from routes-exports to avoid .js extension issues in workspace
export * from '../routes-exports.js';

// Route factory functions (for custom implementations)
export { createSchemaByTypeHandler } from '../routes/schemas-by-type.js';

// Schema utilities
export * from '../schema-utils/index.js';

// Content hash utilities (server-side)
export { createHashForPublishing } from '../utils/content-hash.js';
