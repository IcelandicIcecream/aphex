// local-api/auth-helpers.ts
//
// Helper utilities to convert between Auth types and LocalAPIContext

import type { Auth } from '../types/auth';
import type { LocalAPIContext } from './types';

/**
 * Convert SvelteKit locals.auth to LocalAPIContext
 *
 * This helper bridges the gap between the authentication system
 * (handled in the app layer and enriched by handleAuthHook) and
 * the LocalAPI's context-based approach.
 *
 * Preserves the full Auth object in context.auth so custom permission
 * logic can access any custom fields added via module augmentation.
 *
 * @param auth - Auth object from locals.auth (already validated by handleAuthHook)
 * @returns LocalAPIContext for use with LocalAPI operations
 *
 * @example
 * ```typescript
 * // In a SvelteKit route handler
 * import { authToContext } from '@aphexcms/cms-core/local-api';
 *
 * export const GET: RequestHandler = async ({ locals }) => {
 *   const api = locals.aphexCMS.localAPI;
 *   const context = authToContext(locals.auth);
 *
 *   const pages = await api.collections.page.find(context, {
 *     where: { status: { equals: 'published' } }
 *   });
 *
 *   return json({ data: pages });
 * };
 * ```
 */
export function authToContext(auth: Auth | null | undefined): LocalAPIContext {
	if (!auth) {
		throw new Error('Authentication required');
	}

	// For session auth, extract user and organization info
	if (auth.type === 'session') {
		return {
			organizationId: auth.organizationId,
			user: auth.user,
			auth: auth // Preserve full auth for custom permission logic
		};
	}

	// For API key auth, create a synthetic user for permission checking
	// API keys don't have traditional user accounts, but we need user info
	// for the permission system to work correctly
	if (auth.type === 'api_key') {
		return {
			organizationId: auth.organizationId,
			user: {
				id: `apikey:${auth.keyId}`,
				email: `apikey-${auth.name}@system`,
				name: auth.name,
				// Map API key permissions to user roles for permission checking
				role: auth.permissions.includes('write') ? 'editor' : 'viewer'
			},
			auth: auth // Preserve full auth for custom permission logic
		};
	}

	// This should never happen with proper typing, but just in case
	throw new Error('Unknown auth type');
}

/**
 * Check if auth exists and convert to context
 * Alias for authToContext - more semantic in some contexts
 *
 * @param auth - Auth object from locals.auth
 * @returns LocalAPIContext
 * @throws Error if auth is missing or invalid
 */
export function requireAuth(auth: Auth | null | undefined): LocalAPIContext {
	return authToContext(auth);
}

/**
 * Create a system context for operations that bypass normal permissions
 * Use this for seed scripts, cron jobs, migrations, and other system-level operations
 *
 * @param organizationId - Organization ID for the operation
 * @returns LocalAPIContext with overrideAccess: true
 *
 * @example
 * ```typescript
 * // In a seed script
 * import { systemContext } from '@aphexcms/cms-core/local-api';
 *
 * const api = getLocalAPI();
 * const context = systemContext('org_123');
 *
 * await api.collections.page.create(context, {
 *   data: { title: 'Home', slug: 'home' },
 *   publish: true
 * });
 * ```
 */
export function systemContext(organizationId: string): LocalAPIContext {
	return {
		organizationId,
		overrideAccess: true
	};
}
