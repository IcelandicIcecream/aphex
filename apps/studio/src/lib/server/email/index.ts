// import { createResendAdapter } from '@aphex/resend-adapter';
// import { RESEND_API_KEY } from '$env/static/private';

// export const email = createResendAdapter({
// 	apiKey: RESEND_API_KEY
// });

// // Email template configurations - imported by better-auth
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
	}
};

export type AuthEmailConfig = typeof emailConfig;
