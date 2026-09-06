// Aphex CMS Core - Server-side exports
// These require Node.js and should NOT be imported client-side

// Export all core types from the new central location
export * from '../types/index';

export * from '../auth/provider';

export * from '../cache/index';

export * from '../email/index';

export * from '../ai/index';

// Authentication errors
export { AuthError, type AuthErrorCode } from '../auth/auth-errors';
export { isInstanceEmpty, canDetermineInstanceEmptiness } from '../auth/instance-state';
export * from '../auth/bootstrap';
export * from '../auth/sign-up-policy';
export * from '../auth/account-deletion';

// Configuration system
export { createCMSConfig } from '../config';

// Logger
export { cmsLogger, setLogger, type Logger } from '../utils/logger';
export { DEFAULT_ALLOWED_MIME_TYPES } from '../utils/file-accept';

// CMS Engine
export { CMSEngine } from '../engine';

// Hooks integration (SvelteKit server hooks)
export { createCMSHook, __notifyAphexConfigChanged, type CMSInstances } from '../hooks';

// Database interfaces (no longer export registry or adapters - use adapter packages)
// Plain constants and pure helpers — no imports of their own, so this adds
// nothing to any chunk that already touches this barrel.
export * from '../api/limits';
export * from '../images/index';

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

// Fixed-window throttle for unauthenticated endpoints. Exposed because an app adding its own
// public route needs the same guard the password-reset facades use — and because the caveat
// travels with it: this is per-process memory, so N instances give N× the configured limit.
export {
	RateLimiter,
	clientAddress,
	type RateLimitRule,
	type RateLimitResult
} from './api/rate-limit';

// Job execution — the DB-backed job runner (claim → run handler → complete/retry/fail).
export * from '../jobs/index';

// Schema utilities
export * from '../schema-utils/index';

// Content hash utilities (server-side)
export { createHashForPublishing } from '../utils/content-hash';

// Signed asset URLs — how an app hands a private asset to a viewer who has no
// admin session. Server-only: minting one requires the signing secret.
export {
	signAssetUrl,
	verifyAssetSignature,
	DEFAULT_ASSET_URL_TTL_SECONDS,
	ASSET_SIGNATURE_PARAM,
	ASSET_EXPIRY_PARAM,
	type SignedAssetUrlOptions
} from '../utils/asset-url-signing';

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
	DocumentValidationError,
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
