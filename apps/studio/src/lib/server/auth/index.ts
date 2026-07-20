// apps/studio/src/lib/server/auth/index.ts
//
// Public-facing API for the app's auth module. All auth logic now lives in
// @aphexcms/auth (the first-party Better Auth adapter); this module only injects
// the app-owned dependencies (see ./instance.ts) and re-exports the results.

// The hardened Better Auth instance (used by hooks.server.ts + the api-key route),
// the AuthService, and the AuthProvider handed to createCMSConfig.
export { auth, authService, authProvider } from './instance.js';
