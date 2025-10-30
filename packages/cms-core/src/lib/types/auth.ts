// types/auth.ts
import type { CMSUser } from './user';
import type { OrganizationRole } from './organization';

export interface SessionAuth {
	type: 'session';
	user: CMSUser;
	session: {
		id: string;
		expiresAt: Date;
	};
	organizationId: string;
	organizationRole: OrganizationRole;
	organizations?: Array<{
		id: string;
		name: string;
		slug: string;
		role: OrganizationRole;
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

// Access control utilities

/**
 * Check if a user has write permissions based on their organization role
 * Viewers have read-only access
 */
export function canWrite(auth: Auth): boolean {
	if (auth.type === 'api_key') {
		return auth.permissions.includes('write');
	}
	// Viewers are read-only
	return auth.organizationRole !== 'viewer';
}

/**
 * Check if a user can manage organization members
 * Only owners and admins can manage members
 */
export function canManageMembers(auth: Auth): boolean {
	if (auth.type === 'api_key') {
		return false;
	}
	return auth.organizationRole === 'owner' || auth.organizationRole === 'admin';
}

/**
 * Check if a user can manage API keys
 * Only owners and admins can manage API keys
 */
export function canManageApiKeys(auth: Auth): boolean {
	if (auth.type === 'api_key') {
		return false;
	}
	return auth.organizationRole === 'owner' || auth.organizationRole === 'admin';
}

/**
 * Check if a user is a viewer (read-only access)
 */
export function isViewer(auth: Auth): boolean {
	if (auth.type === 'api_key') {
		return !auth.permissions.includes('write');
	}
	return auth.organizationRole === 'viewer';
}
