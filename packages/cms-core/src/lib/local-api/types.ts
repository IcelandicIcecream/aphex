// local-api/types.ts
//
// Core types for the Local API layer

import type { CMSUser } from '../types/user';

/**
 * Context for Local API operations
 * This provides the necessary information for access control and multi-tenancy
 */
export interface LocalAPIContext {
	/**
	 * Organization ID for multi-tenancy
	 * Required for all operations to ensure proper data isolation
	 */
	organizationId: string;

	/**
	 * Current user (if available)
	 * Used for permission checks and audit trails
	 */
	user?: CMSUser;

	/**
	 * Override access control and RLS
	 * Set to true for system operations (seed scripts, cron jobs, admin tasks)
	 * When true, uses the system database adapter that bypasses RLS
	 * @default false
	 */
	overrideAccess?: boolean;

	/**
	 * Request context for transactions
	 * Can be used to pass SvelteKit RequestEvent or similar context
	 */
	req?: unknown;
}

/**
 * Options for create operations
 */
export interface CreateOptions {
	/**
	 * Draft data for the document/asset
	 */
	data: Record<string, unknown>;

	/**
	 * Whether to immediately publish after creation
	 * @default false
	 */
	publish?: boolean;
}

/**
 * Options for update operations
 */
export interface UpdateOptions {
	/**
	 * Data to update
	 */
	data: Record<string, unknown>;

	/**
	 * Whether to publish after update
	 * @default false
	 */
	publish?: boolean;
}
