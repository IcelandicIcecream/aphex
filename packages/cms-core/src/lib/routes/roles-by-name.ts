// Aphex CMS Roles API Handlers (by-name)
//
// PATCH  /api/roles/[name] — edit description / capabilities
// DELETE /api/roles/[name] — delete a custom role (built-ins cannot be deleted)
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { cmsLogger } from '../utils/logger';
import { hasCapability, BUILTIN_ROLE_NAMES } from '../types/capabilities';
import { updateRoleRequest } from '../api/schemas/roles';

function unauthorized() {
	return json(
		{ success: false, error: 'Unauthorized', message: 'Session authentication required' },
		{ status: 401 }
	);
}

function forbidden(message: string) {
	return json({ success: false, error: 'Forbidden', message }, { status: 403 });
}

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	try {
		const { databaseAdapter, rolesService } = locals.aphexCMS;
		const auth = locals.auth;

		if (!auth || auth.type !== 'session') return unauthorized();
		if (!hasCapability(auth, 'role.manage')) {
			return forbidden('You do not have permission to manage roles');
		}

		const name = params.name;
		if (!name) {
			return json(
				{ success: false, error: 'Invalid request', message: 'Role name is required' },
				{ status: 400 }
			);
		}

		const rawBody = await request.json();
		const parsed = updateRoleRequest.safeParse(rawBody);
		if (!parsed.success) {
			return json(
				{
					success: false,
					error: 'Invalid request body',
					issues: parsed.error.issues
				},
				{ status: 400 }
			);
		}
		const body = parsed.data;

		const updated = await databaseAdapter.updateRole(auth.organizationId, name, body);
		if (!updated) {
			return json(
				{
					success: false,
					error: 'Not found',
					message: `No role named "${name}" in this organization`
				},
				{ status: 404 }
			);
		}

		// Bust the capability cache so open sessions pick up the change on
		// their next request instead of waiting for TTL.
		await rolesService.invalidate(auth.organizationId, name);

		return json({ success: true, data: updated });
	} catch (error) {
		cmsLogger.error('Failed to update role:', error);
		return json(
			{
				success: false,
				error: 'Failed to update role',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		const { databaseAdapter, rolesService } = locals.aphexCMS;
		const auth = locals.auth;

		if (!auth || auth.type !== 'session') return unauthorized();
		if (!hasCapability(auth, 'role.manage')) {
			return forbidden('You do not have permission to manage roles');
		}

		const name = params.name;
		if (!name) {
			return json(
				{ success: false, error: 'Invalid request', message: 'Role name is required' },
				{ status: 400 }
			);
		}

		// Built-ins are part of the org's guaranteed floor — deleting one
		// would let a seed run re-create it with stale capabilities. Force the
		// user to edit instead.
		if ((BUILTIN_ROLE_NAMES as readonly string[]).includes(name)) {
			return forbidden(`"${name}" is a built-in role and cannot be deleted.`);
		}

		// Block deletion while the role is assigned to any member or invitation.
		// Avoids silently orphaning memberships to an unknown role name.
		const members = await databaseAdapter.findOrganizationMembers(auth.organizationId);
		const inUseByMember = members.some((m) => m.role === name);
		const invitations = await databaseAdapter.findOrganizationInvitations(auth.organizationId);
		const inUseByInvitation = invitations.some((i) => i.role === name && !i.acceptedAt);

		if (inUseByMember || inUseByInvitation) {
			return json(
				{
					success: false,
					error: 'Role in use',
					message: `Cannot delete "${name}": reassign affected members or invitations first.`
				},
				{ status: 409 }
			);
		}

		const deleted = await databaseAdapter.deleteRole(auth.organizationId, name);
		if (!deleted) {
			return json(
				{
					success: false,
					error: 'Not found',
					message: `No role named "${name}" in this organization`
				},
				{ status: 404 }
			);
		}

		await rolesService.invalidate(auth.organizationId, name);
		return json({ success: true, message: 'Role deleted' });
	} catch (error) {
		cmsLogger.error('Failed to delete role:', error);
		return json(
			{
				success: false,
				error: 'Failed to delete role',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
