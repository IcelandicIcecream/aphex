// types/auth.ts
import { DatabaseAdapter } from 'src/db/index.js';
import type { CMSUser } from './user.js';

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
}

export interface SessionAuth {
	type: 'session';
	user: CMSUser;
	session: {
		id: string;
		expiresAt: Date;
	};
	organizationId: string;
	organizationRole: 'owner' | 'admin' | 'editor' | 'viewer';
}

export interface ApiKeyAuth {
	type: 'api_key';
	keyId: string;
	name: string;
	permissions: ('read' | 'write')[];
	organizationId: string;
	environment?: string;
	lastUsedAt?: Date;
}

export type Auth = SessionAuth | ApiKeyAuth;
