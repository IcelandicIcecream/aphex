import { Hono } from 'hono';
import { isAccepted, isExpired } from '../../../auth/invitation-status';
import { cmsLogger } from '../../../utils/logger';
import { getPendingInvitations } from '../../queries/pending-invitations';
import type { AphexEnv } from '../index';

const UNAUTHORIZED = {
	success: false,
	error: 'Unauthorized',
	message: 'Session authentication required'
};

/**
 * Invitations addressed to the signed-in user, as opposed to the ones an organization
 * has sent (`/organizations/invitations`). A session with no organization can use
 * these, because accepting an invitation is how it gets one.
 */
export const invitationsRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get('/', async (c) => {
		const auth = c.var.auth;
		if (!auth || auth.type === 'api_key') return c.json(UNAUTHORIZED, 401);
		try {
			const data = await getPendingInvitations(c.var.aphexCMS.databaseAdapter, auth.user.email);
			return c.json({ success: true, data });
		} catch (error) {
			cmsLogger.error('Failed to fetch invitations:', error);
			return c.json({ success: false, error: 'Failed to fetch invitations' }, 500);
		}
	})
	.post('/:id/accept', async (c) => {
		const auth = c.var.auth;
		if (!auth || auth.type === 'api_key') return c.json(UNAUTHORIZED, 401);
		try {
			const { databaseAdapter } = c.var.aphexCMS;
			// Looked up through the caller's address, so an id alone can't claim someone
			// else's invitation.
			const invitations = await databaseAdapter.findInvitationsByEmail(auth.user.email);
			const invitation = invitations.find(({ id }) => id === c.req.param('id'));

			if (!invitation) return c.json({ success: false, error: 'Invitation not found' }, 404);
			if (isAccepted(invitation)) {
				return c.json({ success: false, error: 'Invitation already accepted' }, 400);
			}
			if (isExpired(invitation)) {
				return c.json({ success: false, error: 'Invitation has expired' }, 400);
			}

			await databaseAdapter.acceptInvitation(invitation.token, auth.user.id);
			return c.json({
				success: true,
				data: { organizationId: invitation.organizationId },
				message: 'Invitation accepted'
			});
		} catch (error) {
			cmsLogger.error('Failed to accept invitation:', error);
			return c.json({ success: false, error: 'Failed to accept invitation' }, 500);
		}
	})
	.post('/:id/reject', async (c) => {
		const auth = c.var.auth;
		if (!auth || auth.type === 'api_key') return c.json(UNAUTHORIZED, 401);
		try {
			const { databaseAdapter } = c.var.aphexCMS;
			const invitations = await databaseAdapter.findInvitationsByEmail(auth.user.email);
			const invitation = invitations.find(({ id }) => id === c.req.param('id'));

			if (!invitation) return c.json({ success: false, error: 'Invitation not found' }, 404);
			if (isAccepted(invitation)) {
				return c.json({ success: false, error: 'Invitation already accepted' }, 400);
			}

			await databaseAdapter.deleteInvitation(invitation.id, invitation.organizationId);
			return c.json({ success: true, message: 'Invitation declined' });
		} catch (error) {
			cmsLogger.error('Failed to reject invitation:', error);
			return c.json({ success: false, error: 'Failed to reject invitation' }, 500);
		}
	});
