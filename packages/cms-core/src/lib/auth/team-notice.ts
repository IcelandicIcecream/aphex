import { renderLinkEmail } from '../email/link-email';
import type { CMSInstances } from '../hooks';
import type { RoleNoticeEmailTemplate } from '../types/config';
import { cmsLogger } from '../utils/logger';

/** The roles that can take a site over. */
const NOTABLE_ROLES = ['owner', 'admin'];

type Notice = Parameters<RoleNoticeEmailTemplate['render']>[0];

async function defaultRender({ organizationName, email, role, url }: Notice) {
	const subject = `${email} is now ${role === 'admin' ? 'an admin' : 'an owner'} of ${organizationName}`;
	const content = renderLinkEmail({
		subject,
		intro: `${subject}. They can change its settings and its team.`,
		action: 'Check your team',
		url,
		note: 'If you expected this, there’s nothing to do.'
	});
	return { subject, ...content };
}

/**
 * Tell an organization's owners that someone became an owner or admin of it, when the
 * app has security emails on. Not the person it happened to, nor the one who did it.
 * Never throws, and callers don't wait for it.
 */
export async function notifyOwnersOfRole(
	services: Pick<
		CMSInstances,
		'config' | 'authFeatures' | 'databaseAdapter' | 'emailAdapter' | 'auth'
	>,
	change: {
		organizationId: string;
		userId: string;
		role: string;
		/** Who made the change, when it wasn't the person joining. */
		actorId?: string;
		origin: string;
	}
): Promise<void> {
	const { config, authFeatures, databaseAdapter, emailAdapter, auth } = services;
	const template = config.roleNoticeEmail;
	const from = template?.from ?? emailAdapter?.defaultFrom;
	if (!authFeatures?.securityEmails || !auth || !emailAdapter || !from) return;
	if (!NOTABLE_ROLES.includes(change.role)) return;
	try {
		const [organization, members, person] = await Promise.all([
			databaseAdapter.findOrganizationById(change.organizationId),
			databaseAdapter.findOrganizationMembers(change.organizationId),
			auth.getUserById(change.userId)
		]);
		if (!organization || !person) return;
		const { subject, html, text } = await (template?.render ?? defaultRender)({
			organizationName: organization.name,
			email: person.email,
			role: change.role,
			url: `${change.origin}/admin/settings/members`
		});
		for (const member of members) {
			if (member.role !== 'owner') continue;
			if (member.userId === change.userId || member.userId === change.actorId) continue;
			const owner = await auth.getUserById(member.userId);
			if (!owner) continue;
			const result = await emailAdapter.send({
				from,
				to: owner.email,
				subject,
				html,
				text
			});
			if (result.error) cmsLogger.error('[Email]', 'Failed to send team notice:', result.error);
		}
	} catch (error) {
		cmsLogger.error('[Email]', 'Failed to send team notice:', error);
	}
}
