import { createMailpitAdapter } from '@aphexcms/nodemailer-adapter';
import { createResendAdapter } from '@aphexcms/resend-adapter';
import { env } from '$env/dynamic/private';
import { dev, building } from '$app/environment';
import { cmsLogger } from '@aphexcms/cms-core';
import { passwordReset } from './templates/password-reset';
import { emailVerification } from './templates/email-verification';
import { invitation } from './templates/invitation';

// Mailpit when: SvelteKit build/analyse pass, local dev, or MAILPIT_HOST is
// injected by the platform (staging environments get this automatically).
const useMailpit = dev || building || !!env.MAILPIT_HOST;

export const email = useMailpit
	? createMailpitAdapter({
			host: env.MAILPIT_HOST ?? '127.0.0.1',
			port: env.MAILPIT_SMTP_PORT ? parseInt(env.MAILPIT_SMTP_PORT) : 1025
		})
	: createResendAdapter({ apiKey: env.RESEND_API_KEY ?? '' });

if (!building) {
	if (useMailpit) {
		const host = env.MAILPIT_HOST ?? '127.0.0.1';
		cmsLogger.info('[Email]', `Using Mailpit adapter (${host}:${env.MAILPIT_SMTP_PORT ?? '1025'})`);
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
