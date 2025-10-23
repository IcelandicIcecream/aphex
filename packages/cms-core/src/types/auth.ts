// types/auth.ts
import { DatabaseAdapter } from '../db/index.js';
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
	getUserById(userId: string): Promise<{ id: string; name?: string; email: string } | null>;
	changeUserName(userId: string, name: string): Promise<void>;
	
	// Password reset
	requestPasswordReset(email: string, redirectTo?: string): Promise<void>;
	resetPassword(token: string, newPassword: string): Promise<void>;
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
	organizations?: Array<{
		id: string;
		name: string;
		slug: string;
		role: 'owner' | 'admin' | 'editor' | 'viewer';
		isActive: boolean;
		metadata?: any;
	}>;
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
