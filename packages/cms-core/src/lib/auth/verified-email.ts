import type { AuthUser } from '../types/user';

/**
 * Whether an invitation may be claimed by address alone. Anyone can sign up with an
 * address they don't own, so an unverified one needs the emailed link, which shows the
 * mailbox is theirs. A provider that doesn't say (SSO) is trusted to have checked.
 */
export function ownsEmail(user: Pick<AuthUser, 'emailVerified'>): boolean {
	return user.emailVerified !== false;
}

export const OPEN_INVITATION_LINK =
	'Open the link in your invitation email to answer it. It shows this address is yours.';
