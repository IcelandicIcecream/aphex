// types/auth.ts
import { DatabaseAdapter } from '../db/index.js';
import type { CMSUser } from './user.js';

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
