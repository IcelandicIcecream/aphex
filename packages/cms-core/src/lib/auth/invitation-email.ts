import { renderLinkEmail } from '../email/link-email';
import type { CMSInstances } from '../hooks';
import type { Invitation } from '../types/organization';
import { cmsLogger } from '../utils/logger';
import { invitationUrl } from './pages';

function defaultSubject(organizationName: string): string {
	return `You've been invited to join ${organizationName}`;
}

async function defaultRender(organizationName: string, role: string, inviteUrl: string) {
	return renderLinkEmail({
		subject: defaultSubject(organizationName),
		intro: `You've been invited to join ${organizationName} as ${role}.`,
		action: 'Accept invitation',
		url: inviteUrl,
		note: "If you weren't expecting this, you can ignore this email."
	});
}

/**
 * Email a new invitation. Never throws, and a failure doesn't affect the invitation:
 * with no adapter the invite still exists, and the members page shows its link so it
 * can be shared by hand.
 */
export async function sendInvitationEmail(
	services: Pick<CMSInstances, 'config' | 'databaseAdapter' | 'emailAdapter'>,
	invitation: Invitation,
	origin: string
): Promise<void> {
	const { config, databaseAdapter, emailAdapter } = services;
	if (!emailAdapter) return;

	const template = config.invitationEmail;
	const from = template?.from ?? emailAdapter.defaultFrom;
	if (!from) {
		cmsLogger.warn(
			'[Email]',
			'Invitation email not sent: no sender address. Set `from` on your email adapter.'
		);
		return;
	}

	try {
		const organization = await databaseAdapter.findOrganizationById(invitation.organizationId);
		const name = organization?.name || 'an organization';
		const url = invitationUrl(config, origin, invitation.token);
		const { html, text } = await (template?.render ?? defaultRender)(name, invitation.role, url);
		const result = await emailAdapter.send({
			from,
			to: invitation.email,
			subject: (template?.getSubject ?? defaultSubject)(name),
			html,
			text
		});
		if (result.error) cmsLogger.error('[Email]', 'Failed to send invitation:', result.error);
	} catch (error) {
		cmsLogger.error('[Email]', 'Failed to send invitation:', error);
	}
}
