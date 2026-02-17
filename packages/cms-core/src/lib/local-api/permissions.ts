// local-api/permissions.ts
//
// Permission checking for the Local API layer

import type { LocalAPIContext } from './types';
import type { SchemaType } from '../types/schemas';
import type { CMSConfig } from '../types/config';

/**
 * Permission error thrown when access is denied
 */
export class PermissionError extends Error {
	constructor(
		message: string,
		public readonly operation: string,
		public readonly resource: string
	) {
		super(message);
		this.name = 'PermissionError';
	}
}

/**
 * Checks permissions for Local API operations
 */
export class PermissionChecker {
	constructor(
		private _config: CMSConfig,
		private schemas: Map<string, SchemaType>
	) {}

	/**
	 * Get the CMS config
	 * Available for future per-collection permission logic
	 */
	get config(): CMSConfig {
		return this._config;
	}

	/**
	 * Check if the current context has read permissions for a collection
	 */
	async canRead(context: LocalAPIContext, collectionName: string): Promise<void> {
		// Always allow if overrideAccess is true (system operations)
		if (context.overrideAccess) {
			return;
		}

		// Require authentication for read operations
		if (!context.user) {
			throw new PermissionError(
				'Authentication required for read operations',
				'read',
				collectionName
			);
		}

		// All authenticated users can read (role-based restrictions handled by RLS)
		// Additional per-collection permission logic can be added here in the future
		return;
	}

	/**
	 * Check if the current context has write permissions (create/update)
	 */
	async canWrite(context: LocalAPIContext, collectionName: string): Promise<void> {
		// Always allow if overrideAccess is true (system operations)
		if (context.overrideAccess) {
			return;
		}

		// Require authentication for write operations
		if (!context.user) {
			throw new PermissionError(
				'Authentication required for write operations',
				'write',
				collectionName
			);
		}

		// Check if user has write role (not a viewer)
		// Viewers have read-only access
		if (context.user.role === 'viewer') {
			throw new PermissionError(
				'Write permission denied. Viewers have read-only access.',
				'write',
				collectionName
			);
		}

		// Additional per-collection permission logic can be added here in the future
		return;
	}

	/**
	 * Check if the current context has delete permissions
	 */
	async canDelete(context: LocalAPIContext, collectionName: string): Promise<void> {
		// Always allow if overrideAccess is true (system operations)
		if (context.overrideAccess) {
			return;
		}

		// Require authentication for delete operations
		if (!context.user) {
			throw new PermissionError(
				'Authentication required for delete operations',
				'delete',
				collectionName
			);
		}

		// Viewers have read-only access
		if (context.user.role === 'viewer') {
			throw new PermissionError(
				'Delete permission denied. Viewers have read-only access.',
				'delete',
				collectionName
			);
		}

		// Additional per-collection permission logic can be added here in the future
		return;
	}

	/**
	 * Check if the current context has publish permissions
	 */
	async canPublish(context: LocalAPIContext, collectionName: string): Promise<void> {
		// Always allow if overrideAccess is true (system operations)
		if (context.overrideAccess) {
			return;
		}

		// Require authentication for publish operations
		if (!context.user) {
			throw new PermissionError(
				'Authentication required for publish operations',
				'publish',
				collectionName
			);
		}

		// Check if user has write role (not a viewer)
		if (context.user.role === 'viewer') {
			throw new PermissionError(
				'Publish permission denied. Viewers have read-only access.',
				'publish',
				collectionName
			);
		}

		// Additional per-collection permission logic can be added here in the future
		return;
	}

	/**
	 * Validate that a collection exists in the schema
	 */
	validateCollection(collectionName: string): void {
		if (!this.schemas.has(collectionName)) {
			throw new Error(
				`Collection "${collectionName}" not found in schema. Available collections: ${Array.from(
					this.schemas.keys()
				).join(', ')}`
			);
		}
	}
}
