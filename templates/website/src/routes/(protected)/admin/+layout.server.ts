import type { LayoutServerLoad } from './$types';
import type { SidebarData, SidebarOrganization } from '@aphexcms/cms-core';
import type { SiteSettings } from '$lib/generated-types';
import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';
import { redirect } from '@sveltejs/kit';
import cmsConfig from '../../../../aphex.config';

export const load: LayoutServerLoad = async ({ locals }) => {
	// User is guaranteed to exist here because /admin is protected by auth hook
	const auth = locals.auth;

	if (!auth || auth.type !== 'session') {
		throw redirect(302, '/login');
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
	// Don't advertise the assistant FAB when no aiProvider is configured — POST
	// /api/agent/chat itself 404s in that case, this just keeps the UI consistent with it.
	const agentEnabled = !!cmsConfig.aiProvider;

	// Load the active org's site favicon so the admin browser tab matches the
	// public site. Tolerate a missing/unpublished settings row.
	let faviconUrl: string | null = null;
	try {
		const context = systemContext(auth.organizationId);
		const settings = (await locals.aphexCMS.localAPI.collections.siteSettings.get(context, {
			perspective: 'published'
		})) as SiteSettings | null;
		await locals.aphexCMS.assetService.injectAssetUrls(auth.organizationId, settings);
		faviconUrl = settings?.favicon?.asset?.url ?? null;
	} catch {
		faviconUrl = null;
	}

	return {
		auth,
		title,
		organizations,
		activeOrganization,
		canCreateOrganization,
		faviconUrl,
		agentEnabled,
		// Expose resolved capabilities + active role to the admin shell so
		// client code (UI gating, debug panels) can consult the same set the
		// server enforces against.
		rbac: {
			role: auth.organizationRole,
			capabilities: auth.capabilities ?? []
		}
	};
};
