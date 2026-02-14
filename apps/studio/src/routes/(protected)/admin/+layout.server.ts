import type { LayoutServerLoad } from './$types';
import type { SidebarData, SidebarOrganization } from '@aphexcms/cms-core';
import { redirect } from '@sveltejs/kit';
import cmsConfig from '../../../../aphex.config';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	try {
		// User is guaranteed to exist here because /admin is protected by auth hook
		const auth = locals.auth;

		if (!auth || auth.type !== 'session') {
			console.error('[Layout Load] No session found');
			throw new Error('No session found');
		}

		// Fetch user's organizations directly from database (only once per page load)
		const db = locals.aphexCMS.databaseAdapter;
		const userOrgMemberships = await db.findUserOrganizations(auth.user.id);

		// If user has no orgs and isn't a super_admin, redirect to invitations page
		if (userOrgMemberships.length === 0 && auth.user.role !== 'super_admin') {
			throw redirect(302, '/invitations');
		}

		// Load instance settings to determine org creation permissions
		const instanceSettings = await db.getInstanceSettings();

		// Map to sidebar format
		const organizations: SidebarOrganization[] = userOrgMemberships.map((membership) => ({
			id: membership.organization.id,
			name: membership.organization.name,
			slug: membership.organization.slug,
			role: membership.member.role,
			isActive: membership.organization.id === auth.organizationId,
			metadata: membership.organization.metadata
		}));

		const activeOrganization = organizations.find((org) => org.isActive);

		// Determine if user can create organizations from admin panel
		// Super admins can always create (from god-mode), but from admin panel
		// it depends on the instance setting
		const canCreateOrganization =
			auth.user.role === 'super_admin' || (instanceSettings.allowUserOrgCreation ?? false);

		// Prepare sidebar data
		const sidebarData: SidebarData = {
			user: {
				id: auth.user.id,
				email: auth.user.email,
				name: auth.user.name,
				image: auth.user.image,
				role: auth.user.role
			},
			branding: {
				title: cmsConfig.customization?.branding?.title || 'Aphex CMS'
			},
			// Default nav items (can be customized per app)
			navItems: [
				{ href: '/admin', label: 'Studio' }
				// Apps can add more: Settings, Media, etc.
			],
			organizations,
			activeOrganization,
			canCreateOrganization
		};

		console.log('[Layout Load] Returning sidebarData:', !!sidebarData);

		return {
			sidebarData
		};
	} catch (error) {
		console.error('[Layout Load] Error:', error);
		throw error;
	}
};
