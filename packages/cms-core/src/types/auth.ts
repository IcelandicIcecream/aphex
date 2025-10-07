// types/auth.ts
import type { CMSUser } from './user.js';

export interface AuthProvider {
	// Session auth (browser, admin UI)
	getSession(request: Request): Promise<SessionAuth | null>;
	requireSession(request: Request): Promise<SessionAuth>;

	// API key auth (programmatic access)
	validateApiKey(request: Request): Promise<ApiKeyAuth | null>;
	requireApiKey(request: Request, permission?: 'read' | 'write'): Promise<ApiKeyAuth>;
}

export interface SessionAuth {
	type: 'session';
	user: CMSUser;
	session: {
		id: string;
		expiresAt: Date;
	};
}

export interface ApiKeyAuth {
	type: 'api_key';
	keyId: string;
	name: string;
	permissions: ('read' | 'write')[];
	environment?: string;
	lastUsedAt?: Date;
}

export type Auth = SessionAuth | ApiKeyAuth;
