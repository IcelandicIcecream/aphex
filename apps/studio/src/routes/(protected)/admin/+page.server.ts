export async function load({ locals }) {
	try {
		const { cmsEngine, config } = locals.aphexCMS;
		const documentTypes = await cmsEngine.listDocumentTypes();

		// Check if GraphQL plugin is installed and get its settings
		const graphqlPlugin = config.plugins?.find((p) => p.name === '@aphex/graphql-plugin');
		let graphqlSettings = null;
		if (graphqlPlugin && graphqlPlugin.config) {
			graphqlSettings = {
				endpoint: graphqlPlugin.config.endpoint,
				enableGraphiQL: graphqlPlugin.config.enableGraphiQL
			};
		}

		return {
			documentTypes,
			schemaError: null,
			graphqlSettings
		};
	} catch (error) {
		console.error('Failed to load schema types:', error);

		return {
			documentTypes: [],
			schemaError: {
				message: error instanceof Error ? error.message : 'Unknown schema error'
			},
			graphqlSettings: null
		};
	}
}
