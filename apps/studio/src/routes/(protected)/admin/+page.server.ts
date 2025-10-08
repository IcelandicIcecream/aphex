export async function load({ locals }) {
	try {
		const { cmsEngine } = locals.aphexCMS;
		const documentTypes = await cmsEngine.listDocumentTypes();
		const schemas = await cmsEngine.listSchemas();

		return {
			documentTypes,
			schemas,
			schemaError: null
		};
	} catch (error) {
		console.error('Failed to load schema types:', error);

		return {
			documentTypes: [],
			schemas: [],
			schemaError: {
				message: error instanceof Error ? error.message : 'Unknown schema error'
			}
		};
	}
}
