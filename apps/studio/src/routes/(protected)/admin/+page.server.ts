import { isViewer } from '@aphexcms/cms-core/server';

export async function load({ locals }) {
	try {
		const { cmsEngine, config } = locals.aphexCMS;
		const auth = locals.auth;

		const documentTypes = await cmsEngine.listDocumentTypes();

		// Check if GraphQL plugin is installed and get its settings
		const graphqlPlugin = config.plugins?.find((p) => p.name === '@aphexcms/graphql-plugin');
		let graphqlSettings = null;
		if (graphqlPlugin && graphqlPlugin.config) {
			graphqlSettings = {
				endpoint: graphqlPlugin.config.endpoint,
				enableGraphiQL: graphqlPlugin.config.enableGraphiQL
			};
		}

		// Compute read-only access based on organization role
		const isReadOnly = auth?.type === 'session' ? isViewer(auth) : false;

		return {
			documentTypes,
			schemaError: null,
			graphqlSettings,
			isReadOnly
		};
	} catch (error) {
		console.error('Failed to load schema types:', error);

		return {
			documentTypes: [],
			schemaError: {
				message: error instanceof Error ? error.message : 'Unknown schema error'
			},
			graphqlSettings: null,
			isReadOnly: false
		};
	}
}
