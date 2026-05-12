import { isViewer } from '@aphexcms/cms-core/server';
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	try {
		const { cmsEngine, databaseAdapter } = locals.aphexCMS;
		const auth = locals.auth;

		if (!auth) {
			redirect(307, '/login');
		}

		// Check for schema validation errors
		const schemaError = (locals.aphexCMS as any).schemaError;
		if (schemaError) {
			return {
				documentTypes: [],
				schemaError: {
					message: schemaError.message
				},
				graphqlSettings: null,
				isReadOnly: false,
				userPreferences: null
			};
		}

		const documentTypes = await cmsEngine.listDocumentTypes();
		// Fetch user profile preferences
		const userProfile = await databaseAdapter.findUserProfileById(
			auth.type == 'session' ? auth.user.id : ''
		);
		const userPreferences = userProfile?.preferences || {};

		// Get GraphQL settings (built-in, enabled by default)
		const graphqlSettings = locals.aphexCMS?.graphqlSettings ?? null;

		// Compute read-only access based on organization role
		const isReadOnly = auth?.type === 'session' ? isViewer(auth) : false;

		return {
			documentTypes,
			schemaError: null,
			graphqlSettings,
			isReadOnly,
			userPreferences
		};
	} catch (error) {
		console.error('Failed to load schema types:', error);

		return {
			documentTypes: [],
			schemaError: {
				message: error instanceof Error ? error.message : 'Unknown schema error'
			},
			graphqlSettings: null,
			isReadOnly: false,
			userPreferences: null
		};
	}
}
