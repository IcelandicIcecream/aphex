import type { PageServerLoad } from './$types';
import { authService } from '$lib/server/auth/service';

export const load: PageServerLoad = async ({ locals }) => {
	const { databaseAdapter } = locals.aphexCMS;

	// Load all orgs and instance settings in parallel
	const [allOrgs, instanceSettings] = await Promise.all([
		databaseAdapter.findAllOrganizations(),
		databaseAdapter.getInstanceSettings()
	]);

	// Enrich each org with member count and owner info
	const orgsWithDetails = await Promise.all(
		allOrgs.map(async (org) => {
			const members = await databaseAdapter.findOrganizationMembers(org.id);
			const owner = members.find((m) => m.role === 'owner');

			let ownerEmail: string | undefined;
			if (owner) {
				const ownerUser = await authService.getUserById(owner.userId);
				ownerEmail = ownerUser?.email;
			}

			return {
				id: org.id,
				name: org.name,
				slug: org.slug,
				role: 'owner' as const,
				isActive: false,
				createdBy: org.createdBy,
				createdAt: org.createdAt,
				memberCount: members.length,
				ownerEmail
			};
		})
	);

	return {
		organizations: orgsWithDetails,
		instanceSettings
	};
};
