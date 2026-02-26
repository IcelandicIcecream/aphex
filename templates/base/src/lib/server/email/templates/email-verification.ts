export const emailVerification = {
	subject: 'Verify your email address',
	getHtml: (userName: string, verifyUrl: string) => `
		<h1>Email Verification</h1>
		<p>Hi ${userName},</p>
		<p>Welcome to Aphex CMS! Please verify your email address by clicking the link below:</p>
		<p><a href="${verifyUrl}">Verify Email</a></p>
		<p>If you didn't create this account, you can safely ignore this email.</p>
	`,
	getText: (verifyUrl: string) => `Verify your email by clicking this link: ${verifyUrl}`
};
