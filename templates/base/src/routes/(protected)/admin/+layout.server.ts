import type { LayoutServerLoad } from './$types';
import type { SidebarData, SidebarOrganization } from '@aphexcms/cms-core';
import { redirect } from '@sveltejs/kit';
import cmsConfig from '../../../../aphex.config';

export const load: LayoutServerLoad = async ({ locals }) => {
	// User is guaranteed to exist here because /admin is protected by auth hook
	const auth = locals.auth;

	if (!auth || auth.type !== 'session') {
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
	const title = cmsConfig.customization?.branding?.title || 'Aphex CMS';

	// The base template has no siteSettings singleton — studio/blog load the
	// public site's favicon here so the admin tab matches. If you add one to
	// your content model, resolve it here the same way.
	const faviconUrl: string | null = null;

	return {
		auth,
		title,
		organizations,
		activeOrganization,
		canCreateOrganization,
		faviconUrl,
		// Expose resolved capabilities + active role to the admin shell so
		// client code (UI gating, debug panels) can consult the same set the
		// server enforces against.
		rbac: {
			role: auth.organizationRole,
			capabilities: auth.capabilities ?? []
		}
	};
};
