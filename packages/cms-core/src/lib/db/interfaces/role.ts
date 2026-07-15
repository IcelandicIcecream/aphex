// Roles adapter interface — per-organization role CRUD.
import type { Role, NewRole } from '../../types/capabilities';

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
		data: { description?: string | null; capabilities?: string[] }
	): Promise<Role | null>;

	/** Delete a role by name. Returns `true` when a row was removed. */
	deleteRole(organizationId: string, name: string): Promise<boolean>;

	/**
	 * Ensure the four built-in roles exist for an organization, and that `owner`
	 * still holds every capability.
	 *
	 * Idempotent: inserts missing rows, leaves existing admin/editor/viewer rows
	 * untouched (they are editable), and reconciles `owner` to the full set so a
	 * capability added by a core upgrade reaches orgs seeded before it existed.
	 *
	 * `ownerCapabilities` is what "every capability" means for this install. Callers
	 * that know the plugin registry pass the merged catalog, so plugin-declared
	 * capabilities reach owners; omitting it falls back to core's built-ins, which
	 * would leave an owner unable to hold a capability its own plugins declared.
	 */
	seedBuiltinRoles(organizationId: string, ownerCapabilities?: string[]): Promise<void>;
}
