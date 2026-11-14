// Where the account pages (invitations, password reset, two-factor) live.
import type { CMSConfig } from '../types/config';

/**
 * Core serves these pages from the `/admin` catch-all when login lives there too. A
 * host with its own login page, set by `auth.loginUrl`, keeps its own pages at the
 * root, because its admin layout sends a visitor with no session away from `/admin`.
 */
export function authPagesBase(loginUrl: string | undefined): '/admin' | '' {
	return loginUrl?.startsWith('/admin') ? '/admin' : '';
}

/** The link an invitee follows to accept. */
export function invitationUrl(
	config: Pick<CMSConfig, 'auth'>,
	origin: string,
	token: string
): string {
	return `${origin}${authPagesBase(config.auth?.loginUrl)}/invite/${token}`;
}

/**
 * Admin URLs a visitor can open without a full session: someone following an invite
 * or reset link, midway through a two-factor sign-in, or signed in with no
 * organization yet. Each load decides what to show for the session it finds.
 */
export function isPublicAdminPath(path: string): boolean {
	return (
		path === '/admin/invitations' ||
		path === '/admin/two-factor' ||
		path.startsWith('/admin/invite/') ||
		path.startsWith('/admin/reset-password/')
	);
}
