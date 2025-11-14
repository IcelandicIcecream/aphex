import { authToContext, systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';
import { error } from '@sveltejs/kit';

export async function load({ locals }) {
	try {
		// Get Local API from the singleton (initialized in hooks)
		const { localAPI, databaseAdapter } = locals.aphexCMS;

		// Get organization by slug
		const organization = await databaseAdapter.findOrganizationBySlug('default');

		if (!organization) {
			return error(404, {
				message: "Org doesn't exist"
			});
		}

		// Check if user is logged in (auth is now populated by handleAuthHook for all routes)
		const auth = locals.auth;
		let context;
		let isLoggedIn = false;
		let userRole = null;

		if (auth) {
			// User is logged in - use auth helper to create context
			isLoggedIn = true;
			userRole = auth.type == "session" ? auth.user.role : null
			context = authToContext(auth);
		} else {
			// Not logged in - use system context to fetch public data
			context = systemContext(organization.id);
		}

		// Query pages using Local API
		const result = await localAPI.collections.page.find(context, {
			limit: 1,
			depth: 2,
			// Show draft to logged-in users, published to public
			perspective: isLoggedIn ? 'draft' : 'published',
			where: {
				slug: { equals: 'home' }
			}
		});

		const pageRender = result.docs[0] || null;

		return {
			pageRender,
			isLoggedIn,
			userRole
		};
	} catch (err) {
		console.error('Failed to fetch pageRender:', err);
		return {
			pageRender: null,
			isLoggedIn: false,
			userRole: null,
			error: err instanceof Error ? err.message : 'Unknown error'
		};
	}
}
