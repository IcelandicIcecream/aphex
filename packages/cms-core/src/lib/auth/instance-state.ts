// The single definition of "has this instance been claimed yet?".
//
// Two features hang off this one fact — the bootstrap policy (who gets promoted
// to super admin) and the invite gate (who may sign up at all) — and they must
// agree, or the disagreement is a bypass rather than a bug.
//
// It also has one non-obvious rule that every caller has to get right, which is
// why it lives in one place instead of six: **proof of emptiness, never absence
// of proof.** `hasAnyUserProfiles` is optional on the adapter interface, and an
// adapter that cannot answer must NOT be read as "nobody is here yet". Getting
// that backwards is exactly how a missing implementation once promoted every
// single sign-up to super admin.

import type { DatabaseAdapter } from '../db/interfaces/index';

/**
 * True only when the instance is *provably* empty — the adapter can answer the
 * question, and the answer is "no user profiles exist".
 *
 * Returns `false` when the adapter doesn't implement `hasAnyUserProfiles()`,
 * which is the safe direction: bootstrap promotion is skipped and the invite
 * gate stays shut rather than swinging open.
 */
export async function isInstanceEmpty(db: DatabaseAdapter): Promise<boolean> {
	const countUsers = db.hasAnyUserProfiles?.bind(db);
	if (!countUsers) return false;
	return !(await countUsers());
}

/** Whether the adapter can answer `isInstanceEmpty` at all — for warning about a skipped bootstrap. */
export function canDetermineInstanceEmptiness(db: DatabaseAdapter): boolean {
	return typeof db.hasAnyUserProfiles === 'function';
}
