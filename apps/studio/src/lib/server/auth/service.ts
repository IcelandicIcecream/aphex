// The AuthService now lives in @aphexcms/auth and is constructed in ./instance.ts
// with the app's injected dependencies. Re-exported here so existing consumers
// that import from `$lib/server/auth/service` keep working. Prefer importing
// from `$lib/server/auth`.
export { authService } from './instance.js';
export type { AuthService, ApiKey, ApiKeyWithSecret, CreateApiKeyData } from '@aphexcms/auth';
