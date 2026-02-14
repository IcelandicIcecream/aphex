import { createMailpitAdapter } from '@aphexcms/nodemailer-adapter';
import { createResendAdapter } from '@aphexcms/resend-adapter';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

export const email = dev
	? createMailpitAdapter()
	: createResendAdapter({ apiKey: env.RESEND_API_KEY ?? '' });

if (dev) {
	console.log('[Email]: Using Mailpit adapter (dev mode) — http://localhost:8025');
}

// Email template configurations - imported by better-auth
export const emailConfig = {
	from: 'Ben @ Aphex CMS <ben@newsletter.getaphex.com>',

	passwordReset: {
		subject: 'Reset your password',
		getHtml: (userName: string, resetUrl: string) => `
			<h1>Password Reset</h1>
			<p>Hi ${userName},</p>
			<p>You requested to reset your password. Click the link below to reset it:</p>
			<p><a href="${resetUrl}">Reset Password</a></p>
			<p>If you didn't request this, you can safely ignore this email.</p>
			<p>This link will expire in 1 hour.</p>
		`,
		getText: (resetUrl: string) => `Reset your password by clicking this link: ${resetUrl}`
	},

	emailVerification: {
		subject: 'Verify your email address',
		getHtml: (userName: string, verifyUrl: string) => `
			<h1>Email Verification</h1>
			<p>Hi ${userName},</p>
			<p>Welcome to Aphex CMS! Please verify your email address by clicking the link below:</p>
			<p><a href="${verifyUrl}">Verify Email</a></p>
			<p>If you didn't create this account, you can safely ignore this email.</p>
		`,
		getText: (verifyUrl: string) => `Verify your email by clicking this link: ${verifyUrl}`
	},

	invitation: {
		getSubject: (orgName: string) => `You've been invited to join ${orgName}`,
		getHtml: (orgName: string, role: string, inviteUrl: string) => `
			<h1>Organization Invitation</h1>
			<p>You've been invited to join <strong>${orgName}</strong> as ${role === 'admin' ? 'an' : 'a'} <strong>${role}</strong>.</p>
			<p>Click the link below to accept the invitation:</p>
			<p><a href="${inviteUrl}">Accept Invitation</a></p>
			<p>This invitation will expire in 7 days.</p>
			<p>If you didn't expect this invitation, you can safely ignore this email.</p>
		`,
		getText: (orgName: string, role: string, inviteUrl: string) =>
			`You've been invited to join ${orgName} as a ${role}. Accept the invitation: ${inviteUrl}`
	}
};

export type AuthEmailConfig = typeof emailConfig;
