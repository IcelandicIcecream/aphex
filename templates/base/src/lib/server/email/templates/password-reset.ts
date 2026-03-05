import { renderEmail } from '../renderer';
import PasswordReset from '../components/PasswordReset.svelte';

export const passwordReset = {
	subject: 'Reset your password',
	render: (userName: string, resetUrl: string) =>
		renderEmail(PasswordReset, { userName, resetUrl })
};
