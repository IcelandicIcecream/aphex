import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { databaseAdapter } = locals.aphexCMS;
	const auth = locals.auth;
	const { token } = params;

	// Find the invitation
	const invitation = await databaseAdapter.findInvitationByToken(token);

	if (!invitation) {
		return { error: 'invalid', invitation: null, organization: null };
	}

	if (invitation.acceptedAt) {
		return { error: 'already_accepted', invitation: null, organization: null };
	}

	if (new Date(invitation.expiresAt) < new Date()) {
		return { error: 'expired', invitation: null, organization: null };
	}

	// Get organization details for display
	const org = await databaseAdapter.findOrganizationById(invitation.organizationId);

	// If user is logged in (auth.type === 'session', org may or may not exist)
	if (auth && auth.type === 'session') {
		// Verify the invitation email matches the logged-in user
		if (auth.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
			return {
				error: 'email_mismatch',
				invitation: {
					email: invitation.email,
					role: invitation.role
				},
				organization: org ? { name: org.name, slug: org.slug } : null
			};
		}

		// Accept the invitation
		await databaseAdapter.acceptInvitation(token, auth.user.id);

		// Switch to the new org
		await databaseAdapter.updateUserSession(auth.user.id, invitation.organizationId);

		throw redirect(302, '/admin');
	}

	// Not logged in — show invitation details with sign-in link
	return {
		error: null,
		invitation: {
			email: invitation.email,
			role: invitation.role
		},
		organization: org ? { name: org.name, slug: org.slug } : null
	};
};
