import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

// POST /api/invitations/[id]/accept — Accept a pending invitation
export const POST: RequestHandler = async ({ params, locals }) => {
	try {
		const { databaseAdapter } = locals.aphexCMS;
		const auth = locals.auth;

		if (!auth || auth.type !== 'session') {
			return json(
				{ success: false, error: 'Unauthorized', message: 'Session authentication required' },
				{ status: 401 }
			);
		}

		const invitationId = params.id;

		// Find the invitation by looking up user's invitations and matching ID
		const allInvitations = await databaseAdapter.findInvitationsByEmail(auth.user.email);
		const invitation = allInvitations.find((inv) => inv.id === invitationId);

		if (!invitation) {
			return json(
				{ success: false, error: 'Invitation not found' },
				{ status: 404 }
			);
		}

		if (invitation.acceptedAt !== null) {
			return json(
				{ success: false, error: 'Invitation already accepted' },
				{ status: 400 }
			);
		}

		if (new Date(invitation.expiresAt) < new Date()) {
			return json(
				{ success: false, error: 'Invitation has expired' },
				{ status: 400 }
			);
		}

		// Accept the invitation (creates membership)
		await databaseAdapter.acceptInvitation(invitation.token, auth.user.id);

		return json({
			success: true,
			data: { organizationId: invitation.organizationId },
			message: 'Invitation accepted'
		});
	} catch (error) {
		console.error('Failed to accept invitation:', error);
		return json(
			{
				success: false,
				error: 'Failed to accept invitation',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
