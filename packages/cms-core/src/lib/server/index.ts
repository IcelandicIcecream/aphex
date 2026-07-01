// Aphex CMS Core - Server-side exports
// These require Node.js and should NOT be imported client-side

// Export all core types from the new central location
export * from '../types/index';

export * from '../auth/provider';

export * from '../cache/index';

export * from '../email/index';

// Authentication errors
export { AuthError, type AuthErrorCode } from '../auth/auth-errors';

// Configuration system
export { createCMSConfig } from '../config';

// Logger
export { cmsLogger, setLogger, type Logger } from '../utils/logger';

// CMS Engine
export { CMSEngine } from '../engine';

// Hooks integration (SvelteKit server hooks)
export { createCMSHook, __notifyAphexConfigChanged, type CMSInstances } from '../hooks';

// Database interfaces (no longer export registry or adapters - use adapter packages)
export * from '../db/interfaces/index';

// Storage adapters and interfaces
export * from '../storage/index';
export * from '../storage/interfaces/index';
export * from '../storage/providers/storage';

// Services (includes sharp for image processing)
export * from '../services/index';
export { AssetService } from '../services/asset-service';
export { RolesService } from '../services/roles-service';

// CDN handler — re-exported for the studio/template `media/[id]/[filename]/
// +server.ts` shim. Lives outside `/api` (URLs are baked into published
// documents, can't move onto the catch-all without breaking links).
export { GET as serveAssetCDN } from '../routes/assets-cdn';

// Hono API app — exposed so user apps (and tests) can construct or extend
// the same router the SK catch-all forwards to.
export { createAphexApi, mountAphexBuiltins, toHonoHandler, type AphexEnv } from './api/index';

// Schema utilities
export * from '../schema-utils/index';

// Content hash utilities (server-side)
export { createHashForPublishing } from '../utils/content-hash';

// Preview utilities
export { getPreviewPerspective, type PreviewPerspective } from '../preview/perspective';

// GraphQL (built-in, enabled by default)
export {
	createGraphQLHandler,
	type GraphQLConfig,
	type GraphQLSettings,
	type GraphQLHandlerResult
} from '../graphql/index';

// Local API (unified operations layer)
export {
	LocalAPI,
	createLocalAPI,
	getLocalAPI,
	CollectionAPI,
	SingletonOperationError,
	PermissionChecker,
	PermissionError,
	authToContext,
	requireAuth,
	systemContext,
	type Collections,
	type SingletonCollection,
	type LocalAPIContext,
	type CreateOptions,
	type UpdateOptions
} from '../local-api/index';

// MCP — transport-agnostic tool registry (the MCP route + a future AI panel
// both consume these). The SvelteKit route handler is at ./routes/mcp.
export {
	buildContentTools,
	type McpTool,
	type McpToolResult,
	type McpToolDeps
} from '../mcp/tools';
