// Aphex CMS Core - Server-side exports
// These require Node.js and should NOT be imported client-side

// Export all core types from the new central location
export * from '../types/index';

export * from '../auth/provider';

export * from '../email/index';

// Authentication errors
export { AuthError, type AuthErrorCode } from '../auth/auth-errors';

// Configuration system
export { createCMSConfig } from '../config';

// Hooks integration (SvelteKit server hooks)
export { createCMSHook, type CMSInstances } from '../hooks';

// Database interfaces (no longer export registry or adapters - use adapter packages)
export * from '../db/interfaces/index';

// Storage adapters and interfaces
export * from '../storage/index';
export * from '../storage/interfaces/index';
export * from '../storage/providers/storage';

// Services (includes sharp for image processing)
export * from '../services/index';
export { AssetService } from '../services/asset-service';

// API Route handlers (for re-exporting in your app's API routes)
// Re-export from routes-exports to avoid .js extension issues in workspace
export * from '../routes-exports';

// Schema utilities
export * from '../schema-utils/index';

// Content hash utilities (server-side)
export { createHashForPublishing } from '../utils/content-hash';

// GraphQL (built-in, enabled by default)
export { createGraphQLHandler, type GraphQLConfig, type GraphQLSettings, type GraphQLHandlerResult } from '../graphql/index';

// Local API (unified operations layer)
export {
	LocalAPI,
	createLocalAPI,
	getLocalAPI,
	CollectionAPI,
	PermissionChecker,
	PermissionError,
	type Collections,
	type LocalAPIContext,
	type CreateOptions,
	type UpdateOptions
} from '../local-api/index';
