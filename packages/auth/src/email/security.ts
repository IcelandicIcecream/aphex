import { renderLinkEmail } from '@aphexcms/cms-core/server';
import type { SecurityEmailKind, SecurityEmailNotice, SecurityEmailTemplate } from '../types.js';

const COPY: Record<SecurityEmailKind, { subject: string; what: (name: string | null) => string }> =
	{
		'new-device': {
			subject: 'New sign-in to your account',
			what: () => 'Your account was signed in to from a device we haven’t seen before'
		},
		'password-changed': {
			subject: 'Your password was changed',
			what: () => 'The password for your account was changed'
		},
		'two-factor-disabled': {
			subject: 'Two-factor sign-in was turned off',
			what: () => 'Two-factor sign-in was turned off for your account'
		},
		'api-key-created': {
			subject: 'A new API key was created',
			what: (name) => `An API key${name ? ` called “${name}”` : ''} was created by your account`
		},
		'app-connected': {
			subject: 'An app was connected to your account',
			// Anyone can register an app under any name, so it's only what it calls itself.
			what: (name) =>
				`An app${name ? ` that calls itself “${name}”` : ''} was connected to your account`
		},
		'failed-sign-ins': {
			subject: 'Failed sign-ins to your account',
			what: () => 'Someone tried to sign in to your account several times with the wrong password'
		}
	};

function details({ device, country, at }: SecurityEmailNotice): string {
	const when = new Intl.DateTimeFormat('en', {
		dateStyle: 'long',
		timeStyle: 'short',
		timeZone: 'UTC'
	}).format(at);
	return [device && `, using ${device}`, country && `, in ${country}`, `, on ${when} UTC`]
		.filter(Boolean)
		.join('');
}

export const defaultSecurityEmail: SecurityEmailTemplate = {
	render: async (notice) => {
		const { subject, what } = COPY[notice.kind];
		const content = renderLinkEmail({
			subject,
			greeting: `Hi ${notice.userName},`,
			intro: `${what(notice.name)}${details(notice)}. If that was you, there’s nothing to do. If it wasn’t, secure your account:`,
			action: 'This wasn’t me',
			url: notice.url,
			note: 'That opens a page that signs out every device and has you choose a new password. It works once, for 7 days.'
		});
		return { subject, ...content };
	}
};
