import { error } from '@sveltejs/kit';

export async function load({ locals }) {
	try {
		// Get Local API from the singleton (initialized in hooks)
		const { localAPI, databaseAdapter } = locals.aphexCMS;

		// Get organization by slug
		const organization = await databaseAdapter.findOrganizationBySlug("default")

		if (!organization) {
    		return error(404,{
          		message: "Org doesn't exist"
    		})
		}

		// Query pages using Local API with advanced filtering
		// Type is automatically inferred as FindResult<Page> thanks to module augmentation
		const result = await localAPI.collections.page.find(
			{
				organizationId: organization.id,
				overrideAccess: true // System operation - bypasses RLS and permissions
			},
            {
                limit: 1, // Get just the first page
                depth: 2, // Resolve nested references: hero -> backgroundImage -> asset
                perspective: 'draft',
                where: {
                    slug: { equals: "home"  }
                }
            }
		);

		// Get the first page from the results
		// Type is automatically Page | undefined, no casting needed!
		const pageRender = result.docs[0] || null;

		return { pageRender };
	} catch (error) {
		console.error('Failed to fetch pageRender:', error);
		return {
			pageRender: null,
			error: error instanceof Error ? error.message : 'Unknown error'
		};
	}
}
