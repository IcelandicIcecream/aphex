import { renderLinkEmail } from '@aphexcms/cms-core/server';
import type { AuthEmailTemplate } from '../types.js';

function linkEmail(
	subject: string,
	intro: string,
	action: string,
	note: string
): AuthEmailTemplate {
	return {
		subject,
		render: async (userName, url) =>
			renderLinkEmail({ subject, greeting: `Hi ${userName},`, intro, action, url, note })
	};
}

export const defaultPasswordReset = linkEmail(
	'Reset your password',
	'Follow this link to choose a new password.',
	'Reset password',
	"If you didn't ask for this, you can ignore this email. Your password won't change."
);

export const defaultEmailVerification = linkEmail(
	'Confirm your email address',
	'Follow this link to confirm your email address.',
	'Confirm email',
	"If you didn't create an account, you can ignore this email."
);
