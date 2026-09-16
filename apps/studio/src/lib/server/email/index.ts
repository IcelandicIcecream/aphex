import { connect } from 'node:net';
import { createMailpitAdapter } from '@aphexcms/nodemailer-adapter';
import { createResendAdapter } from '@aphexcms/resend-adapter';
import { env } from '$env/dynamic/private';
import { dev, building } from '$app/environment';
import { cmsLogger } from '@aphexcms/cms-core';
import { EMAIL_FROM } from '$lib/email-sender';
import { passwordReset } from './templates/password-reset';
import { emailVerification } from './templates/email-verification';
import { invitation } from './templates/invitation';
import { twoFactorOtp } from './templates/two-factor-otp';

// During SvelteKit's build/analyze pass we don't need a real adapter — use
// the Mailpit one as a no-op stub (it lazy-connects on send) so the build
// doesn't require RESEND_API_KEY. At runtime, dev → Mailpit, prod → Resend.
// In production, no RESEND_API_KEY means no email adapter — not a crash.
// createResendAdapter throws on an empty key, which would take the whole app
// down at module eval over an optional feature (the CMS already treats a null
// adapter as "email not configured" and logs when a send is skipped).
export const email =
	dev || building
		? createMailpitAdapter()
		: env.RESEND_API_KEY
			? createResendAdapter({ apiKey: env.RESEND_API_KEY })
			: null;

/**
 * Is anything listening on Mailpit's SMTP port? The adapter connects lazily, so
 * it's created either way — but the startup line should say whether mail will
 * actually land somewhere, not just which adapter was picked. A TCP connect to
 * loopback answers in a few ms; the timeout only matters if the port is
 * firewalled to a black hole, which loopback never is.
 */
function probeMailpit(): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = connect({ host: '127.0.0.1', port: 1025 });
		const done = (up: boolean) => {
			socket.destroy();
			resolve(up);
		};
		socket.setTimeout(500, () => done(false));
		socket.once('connect', () => done(true));
		socket.once('error', () => done(false));
	});
}

if (!building) {
	if (dev) {
		void probeMailpit().then((up) => {
			if (up) {
				cmsLogger.info('[Email]', 'Mailpit is running — view emails at http://localhost:8025');
			} else {
				cmsLogger.warn(
					'[Email]',
					'Nothing is listening on :1025 — password resets, invitations and verification emails will fail. ' +
						'Start Mailpit with `pnpm mail`, then read them at http://localhost:8025'
				);
			}
		});
	} else if (!email) {
		cmsLogger.warn(
			'[Email]',
			'RESEND_API_KEY not set — email is disabled. Password resets and invitations will not send.'
		);
	} else {
		cmsLogger.info('[Email]', 'Using Resend adapter (production)');
	}
}

export const emailConfig = {
	// Server-only, so it can read the environment directly (SvelteKit does NOT put `.env` into
	// `process.env` — use `$env/dynamic/private`). Falls back to the shared `EMAIL_FROM` default.
	from: env.APHEX_EMAIL_FROM || EMAIL_FROM,
	passwordReset,
	emailVerification,
	invitation,
	// Presence of this template is what turns on "email me a code instead" at the
	// 2FA challenge — the auth package only registers the OTP path when it can
	// actually render the mail.
	twoFactorOtp
};

export type AuthEmailConfig = typeof emailConfig;
