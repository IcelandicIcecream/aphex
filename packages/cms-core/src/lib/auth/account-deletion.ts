// What has to be true before an account may be deleted, and what has to happen after.
//
// Lives in cms-core rather than in `@aphexcms/auth` for the same reason the sign-up gate
// does: "can this account go?" is a CMS question about organizations and ownership, and it
// must mean the same thing whichever provider authenticated the user. A provider supplies
// the lifecycle hook; it doesn't get to re-derive the rule.

import { cmsLogger } from '../utils/logger';
import type { DatabaseAdapter } from '../db/interfaces/index';

/**
 * Thrown when an account may not be deleted yet. Providers translate it into their own
 * transport error; the message is written to be shown to the user as-is.
 */
export class AccountDeletionBlockedError extends Error {
	readonly code = 'ACCOUNT_DELETION_BLOCKED';
	constructor(message: string) {
		super(message);
		this.name = 'AccountDeletionBlockedError';
	}
}

/**
 * Throws unless this user can leave without stranding an organization.
 *
 * The rule is narrow on purpose: an organization whose only owner deletes their account has
 * nobody left who can add members, change roles, or delete it — the org becomes unreachable
 * to everyone including its remaining members, and no in-product path can recover it. Being
 * the sole *member* is fine, because deleting the organization first is a thing the user can
 * actually do; being the sole *owner* of an org with other people in it is the trap.
 *
 * Enforced server-side rather than in the confirmation dialog: the endpoint is reachable
 * without the UI, and this is the check that decides whether an organization survives.
 */
export async function assertAccountDeletable(db: DatabaseAdapter, userId: string): Promise<void> {
	const memberships = await db.findUserOrganizations(userId);

	const stranded: string[] = [];
	for (const { organization } of memberships) {
		const members = await db.findOrganizationMembers(organization.id);
		const owners = members.filter((m) => m.role === 'owner');

		// Sole owner, and somebody else is still here.
		if (owners.length === 1 && owners[0]?.userId === userId && members.length > 1) {
			stranded.push(organization.name);
		}
	}

	if (stranded.length > 0) {
		throw new AccountDeletionBlockedError(
			`You are the only owner of ${stranded.join(', ')}. Transfer ownership or remove the other ` +
				`members before deleting your account.`
		);
	}
}

/**
 * Detach a deleted user from every organization.
 *
 * `cms_organization_members.user_id` has no foreign key to the profile table — memberships
 * reference the auth layer's user, which cms-core doesn't own — so nothing cascades and a
 * deleted account would otherwise keep appearing in member lists indefinitely, still holding
 * whatever role it had.
 *
 * Call inside the same transaction as the profile delete, after the erasure events are
 * emitted (those read the memberships to know which organizations to fan out to).
 */
export async function detachUserFromOrganizations(
	tx: DatabaseAdapter,
	userId: string,
	organizationIds: readonly string[]
): Promise<void> {
	for (const organizationId of organizationIds) {
		const removed = await tx.removeMember(organizationId, userId);
		if (!removed) {
			cmsLogger.warn(
				'[AccountDeletion]',
				`No membership row for ${userId} in ${organizationId} — nothing to detach.`
			);
		}
	}
}
