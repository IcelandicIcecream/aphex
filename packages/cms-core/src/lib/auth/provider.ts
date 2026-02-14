// packages/cms-core/src/auth/provider.ts
import type { SessionAuth, PartialSessionAuth, ApiKeyAuth } from '../types/index';
import type { DatabaseAdapter } from '../db/interfaces/index';

export interface AuthProvider {
	// Session auth (browser, admin UI)
	getSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth | PartialSessionAuth | null>;
	requireSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth>;

	// API key auth (programmatic access)
	validateApiKey(request: Request, db: DatabaseAdapter): Promise<ApiKeyAuth | null>;
	requireApiKey(
		request: Request,
		db: DatabaseAdapter,
		permission?: 'read' | 'write'
	): Promise<ApiKeyAuth>;

	// User management
	getUserById(userId: string): Promise<{ id: string; name?: string; email: string } | null>;
	changeUserName(userId: string, name: string): Promise<void>;

	// Password reset
	requestPasswordReset(email: string, redirectTo?: string): Promise<void>;
	resetPassword(token: string, newPassword: string): Promise<void>;
}
