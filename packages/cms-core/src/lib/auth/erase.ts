// Erasing a workspace, and erasing an account: everything either one leaves behind, in
// the order that can fail safely. The routes, the account page and God Mode all come
// here, so there is one answer to "is it really gone?".

import type { DatabaseAdapter } from '../db/interfaces/index';
import { emitUserDeleted } from '../events/emit';
import type { AssetService } from '../services/asset-service';
import type { CMSConfig } from '../types/config';
import { cmsLogger } from '../utils/logger';
import {
	AccountDeletionBlockedError,
	assertAccountDeletable,
	detachUserFromOrganizations
} from './account-deletion';
import type { AuthProvider } from './provider';

/** What erasing needs from the running CMS. `CMSInstances` satisfies it. */
export interface EraseServices {
	databaseAdapter: DatabaseAdapter;
	assetService: Pick<AssetService, 'findAssets' | 'deleteAsset'>;
	config?: Pick<CMSConfig, 'beforeOrganizationDelete' | 'beforeAccountDelete'>;
	auth?: Pick<AuthProvider, 'forgetOrganization' | 'getUserById' | 'changeUserImage'>;
}

/** The account being erased, read before it goes. */
export interface AccountToErase {
	id: string;
	email?: string | null;
	image?: string | null;
}

/** Thrown when a workspace can't be deleted now. Its message is for the person deleting it. */
export class OrganizationDeletionBlockedError extends Error {
	readonly code = 'ORGANIZATION_DELETION_BLOCKED';
	constructor(message: string) {
		super(message);
		this.name = 'OrganizationDeletionBlockedError';
	}
}

/**
 * Whether this is a refusal to show the person, from either kind of delete. By `code`
 * and not `instanceof`: a provider and core can load as two copies of this package.
 */
export function isDeletionBlocked(error: unknown): error is Error {
	return (
		error instanceof Error &&
		'code' in error &&
		(error.code === 'ORGANIZATION_DELETION_BLOCKED' || error.code === 'ACCOUNT_DELETION_BLOCKED')
	);
}

/** How many assets to pull per page while erasing an organization's media. */
const ASSET_PAGE_SIZE = 200;

/** The asset behind an avatar of ours (`/media/<id>/<name>`), or null. */
function avatarAssetId(image: string | null | undefined): string | null {
	return /^\/media\/([^/]+)\//.exec(image ?? '')?.[1] ?? null;
}

/**
 * Delete every file of an organization, hidden ones (profile pictures) included.
 *
 * Reads page zero each time: what it read is gone by the next pass. Stops with an
 * error when a file can't be removed, because the rows are the only record of where
 * the files are, and deleting the organization takes the rows.
 */
async function eraseAssets(services: EraseServices, organizationId: string): Promise<Set<string>> {
	const erased = new Set<string>();
	for (;;) {
		const page = await services.assetService.findAssets(organizationId, {
			limit: ASSET_PAGE_SIZE,
			offset: 0,
			includeSystem: true
		});
		if (page.length === 0) return erased;
		let removed = 0;
		for (const asset of page) {
			try {
				await services.assetService.deleteAsset(organizationId, asset.id, { strict: true });
				erased.add(asset.id);
				removed++;
			} catch (error) {
				cmsLogger.error('[Erase]', `Could not erase asset ${asset.id}:`, error);
			}
		}
		if (removed < page.length) {
			throw new OrganizationDeletionBlockedError(
				'Some files could not be deleted, so the workspace was kept. Try again in a minute.'
			);
		}
	}
}

/**
 * Delete an organization and everything in it: the app's own cleanup (billing), files,
 * API keys and connected apps, members, invitations and every row. Permission is the
 * caller's to check.
 *
 * Safe to run again after a failure: each step that already happened is a no-op.
 */
export async function eraseOrganization(
	services: EraseServices,
	{ organizationId, actorId }: { organizationId: string; actorId: string }
): Promise<void> {
	const { databaseAdapter, config, auth } = services;

	// The app first, while nothing has been touched: if it can't be done (a subscription
	// that won't cancel), the organization stays as it was.
	let afterDelete: Awaited<ReturnType<NonNullable<CMSConfig['beforeOrganizationDelete']>>>;
	try {
		afterDelete = await config?.beforeOrganizationDelete?.({ organizationId, userId: actorId });
	} catch (error) {
		throw new OrganizationDeletionBlockedError(
			error instanceof Error && error.message
				? error.message
				: 'The organization could not be deleted. Try again.'
		);
	}

	const members = await databaseAdapter.findOrganizationMembers(organizationId);

	// Files before rows: the rows hold the only record of each file's path.
	const erased = await eraseAssets(services, organizationId);

	// A member's profile picture may have been uploaded here; don't leave it broken.
	for (const member of members) {
		const user = await auth?.getUserById(member.userId);
		const assetId = avatarAssetId(user?.image);
		if (assetId && erased.has(assetId)) await auth?.changeUserImage?.(member.userId, null);
	}

	await auth?.forgetOrganization?.(organizationId);

	await databaseAdapter.withTransaction(async (tx) => {
		await tx.removeAllMembers(organizationId);
		await tx.removeAllInvitations(organizationId);
		await tx.deleteOrganization(organizationId);
	});
	cmsLogger.info('[Erase]', `Organization ${organizationId} deleted by ${actorId}`);

	try {
		if (typeof afterDelete === 'function') await afterDelete();
	} catch (error) {
		// It is gone whatever happens here, so this can't be reported as a failed delete.
		cmsLogger.error('[Erase]', `After deleting organization ${organizationId}:`, error);
	}
}

/** The organizations nobody else belongs to, which can't outlive this account. */
async function soleMemberOrganizations(db: DatabaseAdapter, userId: string): Promise<string[]> {
	const ids: string[] = [];
	for (const { organization } of await db.findUserOrganizations(userId)) {
		const members = await db.findOrganizationMembers(organization.id);
		if (members.length === 1) ids.push(organization.id);
	}
	return ids;
}

/**
 * Erase all the CMS holds about an account: the workspaces only they belong to, their
 * memberships, profile picture, profile, preferences, and invitations to their address.
 * Runs before the auth provider removes the sign-in itself, so a failure leaves an
 * account that can still try again.
 *
 * Throws (see `isDeletionBlocked`) when it would strand a workspace others use.
 */
export async function eraseAccount(
	services: EraseServices,
	user: AccountToErase,
	{ actorId = user.id }: { actorId?: string } = {}
): Promise<void> {
	const { databaseAdapter } = services;
	await assertAccountDeletable(databaseAdapter, user.id);

	for (const organizationId of await soleMemberOrganizations(databaseAdapter, user.id)) {
		await eraseOrganization(services, { organizationId, actorId });
	}

	await services.config?.beforeAccountDelete?.({ userId: user.id });

	const memberships = await databaseAdapter.findUserOrganizations(user.id);
	const organizationIds = memberships.map(({ organization }) => organization.id);
	const email = user.email?.toLowerCase();
	const invitations = email ? await databaseAdapter.findInvitationsByEmail(email) : [];

	// One transaction: after it, the `user.deleted` events are the only pointer left to
	// the picture, and a consumer acts on them even if this process dies now.
	await databaseAdapter.withTransaction(async (tx) => {
		await emitUserDeleted(tx, organizationIds, user);
		await detachUserFromOrganizations(tx, user.id, organizationIds);
		for (const invitation of invitations) await tx.deleteInvitation(invitation.id);
		await tx.deleteUserSession(user.id);
		await tx.deleteUserProfile(user.id);
	});
	cmsLogger.info('[Erase]', `Account ${user.id} erased by ${actorId}`);
}

/** `eraseAccount` for a provider running without the rest of the CMS. */
export async function eraseAccountRows(db: DatabaseAdapter, user: AccountToErase): Promise<void> {
	if ((await soleMemberOrganizations(db, user.id)).length > 0) {
		throw new AccountDeletionBlockedError(
			'Delete the workspaces only you belong to before deleting your account.'
		);
	}
	await eraseAccount(
		{
			databaseAdapter: db,
			assetService: { findAssets: async () => [], deleteAsset: async () => false }
		},
		user
	);
}
