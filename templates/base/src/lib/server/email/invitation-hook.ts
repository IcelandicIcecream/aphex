import type { Hono } from 'hono';
import type { AphexEnv } from '@aphexcms/cms-core/server';
import { email, emailConfig } from './index';

/**
 * Wrap the built-in `/api/organizations/invitations` POST so a successful
 * invite also dispatches the email. Email send is fire-and-forget — never
 * blocks the response, never fails the invite.
 */
export function registerInvitationEmailHook(app: Hono<AphexEnv>) {
	app.use('/organizations/invitations', async (c, next) => {
		if (c.req.method !== 'POST') return next();

		const reqClone = c.req.raw.clone();
		await next();
		if (c.res.status !== 201) return;

		try {
			const body = await reqClone.json();
			const result = await c.res.clone().json();
			const invitation = result.data;
			if (!invitation?.token) return;

			const auth = c.var.auth;
			const { databaseAdapter } = c.var.aphexCMS;
			const org =
				auth && auth.type !== 'partial_session'
					? await databaseAdapter.findOrganizationById(auth.organizationId)
					: null;
			const orgName = org?.name || 'an organization';
			const inviteUrl = `${new URL(c.req.url).origin}/invite/${invitation.token}`;

			void (async () => {
				try {
					const { html, text } = await emailConfig.invitation.render(
						orgName,
						body.role,
						inviteUrl
					);
					await email.send({
						from: emailConfig.from,
						to: body.email.toLowerCase(),
						subject: emailConfig.invitation.getSubject(orgName),
						html,
						text
					});
					console.log(`[Invitations]: Invitation email sent to ${body.email}`);
				} catch (err) {
					console.error(`[Invitations]: Failed to send invitation email to ${body.email}:`, err);
				}
			})();
		} catch (err) {
			console.error('[Invitations]: Failed to send invitation email:', err);
		}
	});
}
