// local-api/permissions.ts
//
// Permission checking for the Local API layer.
//
// Every operation resolves to a capability. A check passes when either:
//   1. The collection schema declares `access[operation]` and the caller's
//      effective organization role appears in the list, OR
//   2. `auth.capabilities` (hydrated by the auth hook via RolesService)
//      contains the capability.
//
// `overrideAccess` short-circuits everything for system operations.

import type { LocalAPIContext } from './types';
import type { SchemaType, SchemaAccess } from '../types/schemas';
import type { Document } from '../types/document';
import type { CMSConfig } from '../types/config';
import type { Auth } from '../types/auth';
import { hasCapability, effectiveOrganizationRole, type Capability } from '../types/capabilities';
import { cmsLogger } from '../utils/logger';

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

type Operation = keyof SchemaAccess;

const OPERATION_CAPABILITY: Record<Operation, Capability> = {
	read: 'document.read',
	create: 'document.create',
	update: 'document.update',
	delete: 'document.delete',
	publish: 'document.publish',
	unpublish: 'document.unpublish'
};

// Human-readable action phrasing for error messages. Keep in sync with
// OPERATION_CAPABILITY and any new Operation keys.
const OPERATION_LABEL: Record<Operation, string> = {
	read: 'view',
	create: 'create',
	update: 'edit',
	delete: 'delete',
	publish: 'publish',
	unpublish: 'unpublish'
};

function denialMessage(operations: Operation[], collectionName: string): string {
	const actions = operations.map((op) => OPERATION_LABEL[op]);
	const action =
		actions.length === 1
			? actions[0]
			: actions.length === 2
				? `${actions[0]} or ${actions[1]}`
				: `${actions.slice(0, -1).join(', ')}, or ${actions[actions.length - 1]}`;
	return `You don't have permission to ${action} ${collectionName} documents. Ask an admin if you need access.`;
}

export class PermissionChecker {
	constructor(
		private _config: CMSConfig,
		private schemas: Map<string, SchemaType>
	) {}

	get config(): CMSConfig {
		return this._config;
	}

	async canRead(context: LocalAPIContext, collectionName: string, doc?: Document): Promise<void> {
		await this.assert(context, collectionName, 'read', doc);
	}

	async canCreate(context: LocalAPIContext, collectionName: string): Promise<void> {
		// `create` has no target doc by definition.
		await this.assert(context, collectionName, 'create');
	}

	async canUpdate(context: LocalAPIContext, collectionName: string, doc?: Document): Promise<void> {
		await this.assert(context, collectionName, 'update', doc);
	}

	/**
	 * @deprecated Prefer `canCreate` or `canUpdate` — this method conflates the
	 * two and was only kept for legacy call sites. It now aliases `canUpdate`
	 * for safety (update is the more restrictive default for mutation).
	 */
	async canWrite(context: LocalAPIContext, collectionName: string, doc?: Document): Promise<void> {
		await this.canUpdate(context, collectionName, doc);
	}

	async canDelete(context: LocalAPIContext, collectionName: string, doc?: Document): Promise<void> {
		await this.assert(context, collectionName, 'delete', doc);
	}

	async canPublish(
		context: LocalAPIContext,
		collectionName: string,
		doc?: Document
	): Promise<void> {
		await this.assert(context, collectionName, 'publish', doc);
	}

	async canUnpublish(
		context: LocalAPIContext,
		collectionName: string,
		doc?: Document
	): Promise<void> {
		await this.assert(context, collectionName, 'unpublish', doc);
	}

	validateCollection(collectionName: string): void {
		if (!this.schemas.has(collectionName)) {
			throw new Error(
				`Collection "${collectionName}" not found in schema. Available collections: ${Array.from(
					this.schemas.keys()
				).join(', ')}`
			);
		}
	}

	// ---- internals -----------------------------------------------------------

	private async assert(
		context: LocalAPIContext,
		collectionName: string,
		operation: Operation,
		doc?: Document
	): Promise<void> {
		if (context.overrideAccess) return;

		const auth = this.requireAuth(context, operation, collectionName);
		if (this.isAllowed(auth, collectionName, operation, doc)) return;

		this.logDenial(auth, operation, collectionName, [OPERATION_CAPABILITY[operation]]);
		throw new PermissionError(
			denialMessage([operation], collectionName),
			operation,
			collectionName
		);
	}

	private logDenial(
		auth: Auth,
		operation: string,
		collectionName: string,
		missingCapabilities: Capability[]
	): void {
		const who =
			auth.type === 'session'
				? `user=${auth.user.id} role="${auth.organizationRole}"`
				: auth.type === 'api_key'
					? `apiKey=${auth.keyId}`
					: auth.type;
		const caps =
			'capabilities' in auth && Array.isArray(auth.capabilities)
				? auth.capabilities.join(',')
				: '(none)';
		cmsLogger.warn(
			'[RBAC]',
			`DENY ${operation} on "${collectionName}" — ${who} has=[${caps}] needs=[${missingCapabilities.join('|')}]`
		);
	}

	private requireAuth(
		context: LocalAPIContext,
		operation: Operation,
		collectionName: string
	): Auth {
		if (!context.auth) {
			throw new PermissionError(
				`You must be signed in to ${OPERATION_LABEL[operation]} ${collectionName} documents.`,
				operation,
				collectionName
			);
		}
		return context.auth;
	}

	/**
	 * Evaluate an access rule for a given operation.
	 *
	 * Three kinds of declared rules:
	 *   - `OrganizationRole[]` — role allowlist (as before).
	 *   - `(ctx) => boolean` — arbitrary policy, receives auth + optional doc.
	 *     Use for ownership rules like `doc.createdBy === auth.user.id`.
	 *   - `undefined` — fall back to capability check.
	 *
	 * A declared-but-excluded role/policy for a session caller is an explicit
	 * deny; the capability map does not re-grant access.
	 */
	private isAllowed(
		auth: Auth,
		collectionName: string,
		operation: Operation,
		doc?: Document
	): boolean {
		const schema = this.schemas.get(collectionName);
		const declared = schema?.access?.[operation];

		if (declared) {
			if (typeof declared === 'function') {
				try {
					return declared({ auth, doc });
				} catch (err) {
					// A throwing policy is a bug, not a grant — log and deny.
					cmsLogger.error(
						'[RBAC]',
						`access policy for "${collectionName}.${operation}" threw:`,
						err
					);
					return false;
				}
			}
			// Array-shaped rule (role allowlist)
			const role = effectiveOrganizationRole(auth);
			if (role && declared.includes(role)) return true;
			if (auth.type === 'session' && role) {
				return false;
			}
			// Unrecognized role (custom roles, API keys) → fall through to
			// capability check so they can still gain access via capabilities.
		}

		return hasCapability(auth, OPERATION_CAPABILITY[operation]);
	}
}
