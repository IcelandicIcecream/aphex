import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';

// DELETE - Delete an API key
export const DELETE: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.auth || locals.auth.type !== 'session') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Check user's organization role - only owner, admin, and editor can delete API keys
		const { databaseAdapter } = locals.aphexCMS;
		if (locals.auth && locals.auth.organizationId) {
			const memberships = await databaseAdapter.findUserOrganizations(locals.auth.user.id);
			const currentMembership = memberships.find(
				(m) => m.organization.id === locals?.auth?.organizationId
			);
			const orgRole = currentMembership?.member.role;

			if (orgRole !== 'owner' && orgRole !== 'admin' && orgRole !== 'editor') {
				return json(
					{ error: 'Forbidden', message: 'Only organization owners, admins, and editors can delete API keys' },
					{ status: 403 }
				);
			}
		}

		const { id } = params;

		if (!id) {
			return json({ error: 'ID not found in params' }, { status: 400 });
		}

		// TODO - don't actually delete the API KEY - instead
		const data = await auth.api.deleteApiKey({
			body: {
				keyId: id // required
			},
			headers: request.headers
		});

		if (data.success) {
			return json({ success: true });
		}

		return json({ error: 'Failed to delete API key' }, { status: 500 });
	} catch (error) {
		console.error('Error deleting API key:', error);
		return json({ error: 'Failed to delete API key' }, { status: 500 });
	}
};
