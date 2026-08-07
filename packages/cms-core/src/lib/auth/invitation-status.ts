// The single definition of what an invitation's state means.
//
// This exists because three call sites independently decided what "pending"
// meant and two of them drifted: the sign-up gate required unaccepted *and*
// unexpired, the members list did the same, but the re-invite check tested only
// `acceptedAt === null`. An expired invitation therefore blocked re-inviting
// while being unusable and invisible — a permanent deadlock for that address.
//
// Anything that asks a question about invitation state imports from here. If a
// rule changes (grace periods, revocation, resend windows), it changes once.

import type { Invitation } from '../types/organization';

/** The minimum shape these predicates need — so callers can pass rows from any layer. */
export type InvitationState = Pick<Invitation, 'expiresAt' | 'acceptedAt'>;

/** Default lifetime for a new invitation. */
export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** When a freshly-created invitation should expire. */
export function invitationExpiryFrom(now: Date = new Date()): Date {
	return new Date(now.getTime() + INVITATION_TTL_MS);
}

export function isAccepted(invitation: InvitationState): boolean {
	return invitation.acceptedAt !== null;
}

export function isExpired(invitation: InvitationState, now: Date = new Date()): boolean {
	return new Date(invitation.expiresAt).getTime() <= now.getTime();
}

/**
 * Redeemable right now: not yet accepted and not yet expired.
 *
 * The only question worth asking in most places — whether a sign-up may proceed,
 * whether to show it in the members list, whether a re-invite is redundant.
 */
export function isPendingInvitation(invitation: InvitationState, now: Date = new Date()): boolean {
	return !isAccepted(invitation) && !isExpired(invitation, now);
}

/**
 * Lapsed without being used, so it is safe to clear and replace.
 *
 * Deliberately distinct from `!isPendingInvitation(...)`: an *accepted*
 * invitation is also "not pending", but deleting it would erase the record that
 * someone joined by invitation.
 */
export function isStaleInvitation(invitation: InvitationState, now: Date = new Date()): boolean {
	return !isAccepted(invitation) && isExpired(invitation, now);
}
