import { renderEmail } from '../renderer';
import Invitation from '../components/Invitation.svelte';

export const invitation = {
	getSubject: (orgName: string) => `You've been invited to join ${orgName}`,
	render: (orgName: string, role: string, inviteUrl: string) =>
		renderEmail(Invitation, { orgName, role, inviteUrl })
};
