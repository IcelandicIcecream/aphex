// Minimal server-side data loading - Sanity Studio style
export async function load() {
	try {
		// Try to import schemas - this will trigger validation
		const { schemaTypes } = await import('$lib/schemaTypes/index.js');

		// Just return the basic document types for initial render
		const documentTypes = schemaTypes
			.filter((schema) => schema.type === 'document')
			.map((schema) => ({
				name: schema.name,
				title: schema.title,
				description: schema.description
			}));

		return {
			documentTypes,
			schemaError: null
		};
	} catch (error) {
		console.error('Failed to load schema types:', error);

		// Return schema validation error for display
		return {
			documentTypes: [],
			schemaError: {
				message: error instanceof Error ? error.message : 'Unknown schema error'
			}
		};
	}
}
