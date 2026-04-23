// Roles adapter interface — per-organization role CRUD.
import type { Role, NewRole, Capability } from '../../types/capabilities';

export interface RolesAdapter {
	/** List all roles for an organization (built-in + custom). */
	listRoles(organizationId: string): Promise<Role[]>;

	/** Look up a single role by its name within an organization. */
	findRoleByName(organizationId: string, name: string): Promise<Role | null>;

	/** Create a new role. Uniqueness is enforced on (organizationId, name). */
	createRole(data: NewRole): Promise<Role>;

	/**
	 * Update the capabilities/description of an existing role.
	 * Returns `null` if no row matched.
	 */
	updateRole(
		organizationId: string,
		name: string,
		data: { description?: string | null; capabilities?: Capability[] }
	): Promise<Role | null>;

	/** Delete a role by name. Returns `true` when a row was removed. */
	deleteRole(organizationId: string, name: string): Promise<boolean>;

	/**
	 * Ensure the four built-in roles exist for an organization.
	 * Idempotent: inserts missing rows and leaves existing ones untouched.
	 */
	seedBuiltinRoles(organizationId: string): Promise<void>;
}
