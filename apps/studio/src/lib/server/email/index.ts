import { createMailpitAdapter } from '@aphexcms/nodemailer-adapter';
import { createResendAdapter } from '@aphexcms/resend-adapter';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { passwordReset } from './templates/password-reset';
import { emailVerification } from './templates/email-verification';
import { invitation } from './templates/invitation';

export const email = dev
	? createMailpitAdapter()
	: createResendAdapter({ apiKey: env.RESEND_API_KEY ?? '' });

if (dev) {
	console.log('[Email]: Using Mailpit adapter (dev mode) — http://localhost:8025');
}

export const emailConfig = {
	from: 'Ben @ Aphex CMS <ben@newsletter.getaphex.com>',
	passwordReset,
	emailVerification,
	invitation
};

export type AuthEmailConfig = typeof emailConfig;
