export async function load({ locals }) {
	try {
		const { cmsEngine } = locals.aphexCMS;
		const documentTypes = await cmsEngine.listDocumentTypes();

		return {
			documentTypes,
			schemaError: null
		};
	} catch (error) {
		console.error('Failed to load schema types:', error);

		return {
			documentTypes: [],
			schemaError: {
				message: error instanceof Error ? error.message : 'Unknown schema error'
			}
		};
	}
}
