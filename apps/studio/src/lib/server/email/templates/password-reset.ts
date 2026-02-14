export const passwordReset = {
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
};
