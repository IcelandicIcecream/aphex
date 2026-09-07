import { renderEmail } from '../renderer';
import EmailVerification from '../components/EmailVerification.svelte';

export const emailVerification = {
	subject: 'Verify your email address',
	render: (userName: string, verifyUrl: string) =>
		renderEmail(EmailVerification, { userName, verifyUrl })
};
