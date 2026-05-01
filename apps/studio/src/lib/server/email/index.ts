import { createMailpitAdapter } from '@aphexcms/nodemailer-adapter';
import { createResendAdapter } from '@aphexcms/resend-adapter';
import { env } from '$env/dynamic/private';
import { dev, building } from '$app/environment';
import { cmsLogger } from '@aphexcms/cms-core';
import { passwordReset } from './templates/password-reset';
import { emailVerification } from './templates/email-verification';
import { invitation } from './templates/invitation';

// During SvelteKit's build/analyse pass we don't need a real adapter — use
// the Mailpit one as a no-op stub (it lazy-connects on send) so the build
// doesn't require RESEND_API_KEY. At runtime, dev → Mailpit, prod → Resend.
export const email =
	dev || building
		? createMailpitAdapter()
		: createResendAdapter({ apiKey: env.RESEND_API_KEY ?? '' });

if (!building) {
	if (dev) {
		cmsLogger.info('[Email]', 'Using Mailpit adapter (dev mode)');
		cmsLogger.info('[Email]', 'View emails at http://localhost:8025');
	} else {
		cmsLogger.info('[Email]', 'Using Resend adapter (production)');
	}
}

export const emailConfig = {
	from: 'Ben @ Aphex CMS <ben@newsletter.getaphex.com>',
	passwordReset,
	emailVerification,
	invitation
};

export type AuthEmailConfig = typeof emailConfig;
