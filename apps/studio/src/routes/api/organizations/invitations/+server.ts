import type { RequestHandler } from './$types';
import { inviteMember, cancelInvitation as DELETE } from '@aphexcms/cms-core/server';
import { email, emailConfig } from '$lib/server/email';

export { DELETE };

// Wrap the core inviteMember handler to send invitation emails
export const POST: RequestHandler = async (event) => {
	// Clone the request so we can read the body for email sending
	const clonedRequest = event.request.clone();

	// Call the core handler
	const response = await inviteMember(event);

	// If invitation was created successfully, send the email
	if (response.status === 201) {
		try {
			const body = await clonedRequest.json();
			const result = await response.clone().json();
			const invitation = result.data;

			if (invitation?.token) {
				const { databaseAdapter } = event.locals.aphexCMS;
				const auth = event.locals.auth;

				const org = auth && auth.type !== 'partial_session' ? await databaseAdapter.findOrganizationById(auth.organizationId) : null;
				const orgName = org?.name || 'an organization';
				const inviteUrl = `${event.url.origin}/invite/${invitation.token}`;

				// Fire-and-forget — don't block the response on email delivery
				email.send({
					from: emailConfig.from,
					to: body.email.toLowerCase(),
					subject: emailConfig.invitation.getSubject(orgName),
					html: emailConfig.invitation.getHtml(orgName, body.role, inviteUrl),
					text: emailConfig.invitation.getText(orgName, body.role, inviteUrl)
				}).then(() => {
					console.log(`[Invitations]: Invitation email sent to ${body.email}`);
				}).catch((err) => {
					console.error(`[Invitations]: Failed to send invitation email to ${body.email}:`, err);
				});
			}
		} catch (emailError) {
			console.error('[Invitations]: Failed to send invitation email:', emailError);
			// Don't fail — the invitation was already created
		}
	}

	return response;
};
