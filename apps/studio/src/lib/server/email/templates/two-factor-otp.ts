import { renderEmail } from '../renderer';
import TwoFactorCode from '../components/TwoFactorCode.svelte';

export const twoFactorOtp = {
	subject: 'Your sign-in code',
	render: (userName: string, code: string) => renderEmail(TwoFactorCode, { userName, code })
};
