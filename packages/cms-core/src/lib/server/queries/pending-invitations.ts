import type { PendingInvitation } from '../../api/invitations';
import { isPendingInvitation } from '../../auth/invitation-status';
import type { DatabaseAdapter } from '../../db/index';

/**
 * The invitations waiting for this address, newest first, with their organization's
 * name. Used by both the invitations view and `GET /invitations`.
 */
export async function getPendingInvitations(
	databaseAdapter: DatabaseAdapter,
	email: string
): Promise<PendingInvitation[]> {
	const invitations = await databaseAdapter.findInvitationsByEmail(email);
	const pending = invitations
		.filter((invitation) => isPendingInvitation(invitation))
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

	return Promise.all(
		pending.map(async (invitation) => {
			const organization = await databaseAdapter.findOrganizationById(invitation.organizationId);
			return {
				id: invitation.id,
				organizationId: invitation.organizationId,
				organizationName: organization?.name ?? 'Unknown',
				organizationSlug: organization?.slug ?? '',
				role: invitation.role,
				email: invitation.email,
				expiresAt: invitation.expiresAt,
				createdAt: invitation.createdAt
			};
		})
	);
}
