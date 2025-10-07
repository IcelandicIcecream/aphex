// packages/cms-core/src/auth/provider.ts
import type { SessionAuth, ApiKeyAuth } from '../types/index.js';

export interface AuthProvider {
	// Session auth (browser, admin UI)
	getSession(request: Request): Promise<SessionAuth | null>;
	requireSession(request: Request): Promise<SessionAuth>;

	// API key auth (programmatic access)
	validateApiKey(request: Request): Promise<ApiKeyAuth | null>;
	requireApiKey(request: Request, permission?: 'read' | 'write'): Promise<ApiKeyAuth>;
}
