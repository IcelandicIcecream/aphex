// packages/cms-core/src/auth/provider.ts
import type { SessionAuth, ApiKeyAuth } from '../types/index.js';
import type { DatabaseAdapter } from '../db/interfaces/index.js';

export interface AuthProvider {
	// Session auth (browser, admin UI)
	getSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth | null>;
	requireSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth>;

	// API key auth (programmatic access)
	validateApiKey(request: Request, db: DatabaseAdapter): Promise<ApiKeyAuth | null>;
	requireApiKey(
		request: Request,
		db: DatabaseAdapter,
		permission?: 'read' | 'write'
	): Promise<ApiKeyAuth>;

	// User management
	changeUserName(userId: string, name: string): Promise<void>;
}
