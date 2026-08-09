import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { cmsLogger } from '../../../utils/logger';
import { updateOrganizationRequest } from '../../../api/schemas/organizations';
import { isInstanceRole } from '../../../types/capabilities';
import type { AphexEnv } from '../index';

/** How many assets to pull per page while erasing an organization's media. */
const ASSET_ERASE_PAGE_SIZE = 200;

/**
 * Delete every asset in an organization — object storage included.
 *
 * Paged rather than loaded at once so a large media library doesn't have to fit in
 * memory. Always reads page zero: each pass deletes what it read, so the next unerased
 * asset is always at the front. Best-effort per asset — one failed object shouldn't
 * abandon the rest, and the caller's retry will pick up whatever is left.
 */
async function eraseOrganizationAssets(
	assetService: {
		findAssets(
			organizationId: string,
			filters?: { limit?: number; offset?: number }
		): Promise<Array<{ id: string }>>;
		deleteAsset(organizationId: string, id: string): Promise<boolean>;
	},
	organizationId: string
): Promise<void> {
	for (;;) {
		const page = await assetService.findAssets(organizationId, {
			limit: ASSET_ERASE_PAGE_SIZE,
			offset: 0
		});
		if (page.length === 0) return;

		let erased = 0;
		for (const asset of page) {
			try {
				await assetService.deleteAsset(organizationId, asset.id);
				erased++;
			} catch (error) {
				cmsLogger.warn(`Could not erase asset ${asset.id} while deleting org:`, error);
			}
		}

		// Nothing went away, so paging again would loop forever on the same failures.
		if (erased === 0) {
			cmsLogger.error(
				`Stopped erasing assets for org ${organizationId}: ${page.length} remain and none could be deleted.`
			);
			return;
		}
	}
}

export const organizationsByIdRouter: Hono<AphexEnv> = new Hono<AphexEnv>()
	.get('/:id', async (c) => {
		try {
			const { databaseAdapter } = c.var.aphexCMS;
			const auth = c.var.auth;
			const id = c.req.param('id');

			if (!auth || auth.type !== 'session') {
				return c.json(
					{
						success: false,
						error: 'Unauthorized',
						message: 'Session authentication required'
					},
					401
				);
			}

			if (!id) {
				return c.json(
					{
						success: false,
						error: 'Missing required field',
						message: 'Organization ID is required'
					},
					400
				);
			}

			const membership = await databaseAdapter.findUserMembership(auth.user.id, id);
			if (!membership) {
				return c.json(
					{
						success: false,
						error: 'Forbidden',
						message: 'You are not a member of this organization'
					},
					403
				);
			}

			const organization = await databaseAdapter.findOrganizationById(id);
			if (!organization) {
				return c.json({ success: false, error: 'Organization not found' }, 404);
			}

			return c.json({ success: true, data: organization });
		} catch (error) {
			cmsLogger.error('Failed to fetch organization:', error);
			return c.json(
				{
					success: false,
					error: 'Failed to fetch organization',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	})
	.patch(
		'/:id',
		zValidator('json', updateOrganizationRequest, (result, c) => {
			if (!result.success) {
				return c.json(
					{
						success: false,
						error: 'Invalid request body',
						issues: result.error.issues
					},
					400
				);
			}
		}),
		async (c) => {
			try {
				const { databaseAdapter, rolesService } = c.var.aphexCMS;
				const auth = c.var.auth;
				const id = c.req.param('id');

				if (!auth || auth.type !== 'session') {
					return c.json(
						{
							success: false,
							error: 'Unauthorized',
							message: 'Session authentication required'
						},
						401
					);
				}

				if (!id) {
					return c.json(
						{
							success: false,
							error: 'Missing required field',
							message: 'Organization ID is required'
						},
						400
					);
				}

				const membership = await databaseAdapter.findUserMembership(auth.user.id, id);

				// Capabilities have to be evaluated against the *target* organization.
				// `auth.capabilities` is resolved once per request for the caller's
				// **active** org, so checking it here let an admin in org A who is only a
				// viewer in org B edit B's settings simply by leaving A active.
				// Instance roles still override — they hold every capability everywhere.
				let canEditSettings = isInstanceRole(auth);
				if (membership && !canEditSettings) {
					const targetCapabilities = await rolesService.getCapabilities(id, membership.role);
					canEditSettings = targetCapabilities.includes('org.settings');
				}

				if (!membership || !canEditSettings) {
					return c.json(
						{
							success: false,
							error: 'Forbidden',
							message: 'You do not have permission to update organization settings'
						},
						403
					);
				}

				const body = c.req.valid('json');

				if (body.slug) {
					const existingOrg = await databaseAdapter.findOrganizationBySlug(body.slug);
					if (existingOrg && existingOrg.id !== id) {
						return c.json(
							{
								success: false,
								error: 'Slug already exists',
								message: `Organization with slug '${body.slug}' already exists`
							},
							409
						);
					}
				}

				const updateData: {
					name?: string;
					slug?: string;
					metadata?: any;
				} = {};
				if (body.name !== undefined) updateData.name = body.name;
				if (body.slug !== undefined) updateData.slug = body.slug;
				if (body.metadata !== undefined) updateData.metadata = body.metadata;

				const updatedOrganization = await databaseAdapter.updateOrganization(id, updateData);
				if (!updatedOrganization) {
					return c.json({ success: false, error: 'Organization not found' }, 404);
				}

				return c.json({ success: true, data: updatedOrganization });
			} catch (error) {
				cmsLogger.error('Failed to update organization:', error);
				return c.json(
					{
						success: false,
						error: 'Failed to update organization',
						message: error instanceof Error ? error.message : 'Unknown error'
					},
					500
				);
			}
		}
	)
	.delete('/:id', async (c) => {
		try {
			const { databaseAdapter } = c.var.aphexCMS;
			const auth = c.var.auth;
			const id = c.req.param('id');

			if (!auth || auth.type !== 'session') {
				return c.json(
					{
						success: false,
						error: 'Unauthorized',
						message: 'Session authentication required'
					},
					401
				);
			}

			if (!id) {
				return c.json(
					{
						success: false,
						error: 'Missing required field',
						message: 'Organization ID is required'
					},
					400
				);
			}

			const membership = await databaseAdapter.findUserMembership(auth.user.id, id);
			if (!membership || membership.role !== 'owner') {
				return c.json(
					{
						success: false,
						error: 'Forbidden',
						message: 'Only owners can delete an organization'
					},
					403
				);
			}

			const members = await databaseAdapter.findOrganizationMembers(id);
			for (const member of members) {
				const userSession = await databaseAdapter.findUserSession(member.userId);
				if (userSession?.activeOrganizationId === id) {
					const otherOrgs = await databaseAdapter.findUserOrganizations(member.userId);
					const remainingOrgs = otherOrgs.filter((org) => org.organization.id !== id);

					if (remainingOrgs.length > 0 && remainingOrgs[0]) {
						await databaseAdapter.updateUserSession(
							member.userId,
							remainingOrgs[0].organization.id
						);
					} else {
						await databaseAdapter.deleteUserSession(member.userId);
					}
				}
			}

			// Files first, while the rows that point at them still exist. Deleting the
			// organization cascades its `cms_assets` rows away, and those rows hold the
			// only record of each object's storage path — so anything not erased here
			// stays in the bucket forever, unreferenced and unfindable, still publicly
			// readable by URL. `assetService.deleteAsset` removes the object *and* the
			// row; the cascade then has less to do.
			//
			// Synchronous and unbounded, which is the known limit: an organization with
			// tens of thousands of assets will make this request slow. The durable fix is
			// to drain them through the job queue, which needs a deletion state machine
			// (the org has to stay readable while its assets are erased) — deliberately
			// not built here. It is safe to retry: an already-erased asset is a no-op.
			await eraseOrganizationAssets(c.var.aphexCMS.assetService, id);

			await databaseAdapter.removeAllMembers(id);
			await databaseAdapter.removeAllInvitations(id);
			await databaseAdapter.deleteOrganization(id);

			return c.json({ success: true, message: 'Organization deleted successfully' });
		} catch (error) {
			cmsLogger.error('Failed to delete organization:', error);
			return c.json(
				{
					success: false,
					error: 'Failed to delete organization',
					message: error instanceof Error ? error.message : 'Unknown error'
				},
				500
			);
		}
	});
