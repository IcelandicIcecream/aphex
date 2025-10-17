import type { LayoutServerLoad } from './$types';
import type { SidebarData, SidebarOrganization } from '@aphex/cms-core';
import cmsConfig from '../../../../aphex.config';

export const load: LayoutServerLoad = async ({ locals }) => {
	// User is guaranteed to exist here because /admin is protected by auth hook
	const auth = locals.auth;

	console.log('AUTH: ', auth);
	if (!auth || auth.type !== 'session') {
		throw new Error('No session found');
	}

	// Fetch user's organizations directly from database (only once per page load)
	const db = locals.aphexCMS.databaseAdapter;
	const userOrgMemberships = await db.findUserOrganizations(auth.user.id);

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
			{ href: '/admin', label: 'Content' }
			// Apps can add more: Settings, Media, etc.
		],
		organizations,
		activeOrganization
	};

	return {
		sidebarData
	};
};
