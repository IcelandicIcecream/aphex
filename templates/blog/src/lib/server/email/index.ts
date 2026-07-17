import { createMailpitAdapter } from '@aphexcms/nodemailer-adapter';
import { createResendAdapter } from '@aphexcms/resend-adapter';
import { env } from '$env/dynamic/private';
import { dev, building } from '$app/environment';
import { cmsLogger } from '@aphexcms/cms-core';
import { passwordReset } from './templates/password-reset';
import { emailVerification } from './templates/email-verification';
import { invitation } from './templates/invitation';

// During SvelteKit's build/analyze pass we don't need a real adapter — use
// the Mailpit one as a no-op stub (it lazy-connects on send) so the build
// doesn't require RESEND_API_KEY. At runtime, dev → Mailpit, prod → Resend.
// In production, no RESEND_API_KEY means no email adapter — not a crash.
// createResendAdapter throws on an empty key, which would take the whole app
// down at module eval over an optional feature (the CMS already treats a null
// adapter as "email not configured" and logs when a send is skipped). This is
// what lets the Docker image boot with nothing configured: email verification
// defaults off, so signup completes without a mail server.
export const email =
	dev || building
		? createMailpitAdapter()
		: env.RESEND_API_KEY
			? createResendAdapter({ apiKey: env.RESEND_API_KEY })
			: null;

if (!building) {
	if (dev) {
		cmsLogger.info('[Email]', 'Using Mailpit adapter (dev mode)');
		cmsLogger.info('[Email]', 'View emails at http://localhost:8025');
	} else if (email) {
		cmsLogger.info('[Email]', 'Using Resend adapter (production)');
	} else {
		cmsLogger.warn(
			'[Email]',
			'RESEND_API_KEY not set — email is disabled. Password resets and invitations will not send.'
		);
	}
}

export const emailConfig = {
	from: 'Ben @ Aphex CMS <ben@newsletter.getaphex.com>',
	passwordReset,
	emailVerification,
	invitation
};

export type AuthEmailConfig = typeof emailConfig;
