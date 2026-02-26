export const invitation = {
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
};
