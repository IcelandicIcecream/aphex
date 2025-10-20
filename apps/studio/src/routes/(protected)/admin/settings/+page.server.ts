import type { PageServerLoad } from './$types';
import { drizzleDb } from '$lib/server/db';
import { apikey } from '$lib/server/db/auth-schema';
import { organizationService } from '$lib/server/services/organization';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals }) => {
	// User is guaranteed to exist because /admin is protected
	const auth = locals.auth;

	if (!auth || auth.type !== 'session') {
		throw new Error('No session found');
	}

	// Fetch user's API keys
	const userApiKeys = await drizzleDb.query.apikey.findMany({
		where: eq(apikey.userId, auth.user.id),
		columns: {
			id: true,
			name: true,
			metadata: true,
			expiresAt: true,
			lastRequest: true,
			createdAt: true
		},
		orderBy: (apikey, { desc }) => [desc(apikey.createdAt)]
	});

	// Extract permissions from metadata and filter by organization
	const apiKeysWithPermissions = userApiKeys
		.map((key) => {
			// Handle double-encoded JSON (metadata might be stored as stringified string)
			let metadata = key.metadata;
			if (typeof metadata === 'string') {
				metadata = JSON.parse(metadata);
				// If it's still a string after first parse, parse again
				if (typeof metadata === 'string') {
					metadata = JSON.parse(metadata);
				}
			}
			metadata = metadata || null;

			return {
				...key,
				permissions: metadata.permissions || [],
				organizationId: metadata.organizationId
			};
		})
		.filter((key) => key.organizationId === auth.organizationId);

	// Fetch active organization with members (via organization service)
	const databaseAdapter = locals.aphexCMS.databaseAdapter;
	let activeOrganization = null;
	let pendingInvitations = [];

	if (auth.organizationId) {
		const orgData = await organizationService.getOrganizationWithMembers(auth.organizationId);
		if (orgData) {
			// Transform to match component expectations (flatten structure)
			activeOrganization = {
				...orgData.organization,
				members: orgData.members.map((m) => ({
					...m.member,
					user: m.user,
					invitedEmail: m.invitedEmail
				}))
			};
		}

		// Fetch pending invitations for this organization
		const invitations = await databaseAdapter.findOrganizationInvitations(auth.organizationId);
		pendingInvitations = invitations.filter((inv) => !inv.acceptedAt && inv.expiresAt > new Date());
	}

	return {
		user: {
			id: auth.user.id,
			email: auth.user.email,
			name: auth.user.name,
			role: auth.user.role
		},
		apiKeys: apiKeysWithPermissions,
		activeOrganization,
		pendingInvitations
	};
};
