// Aphex CMS Schema API Handlers - Get schema by type
import type { RequestHandler } from '@sveltejs/kit';
import type { SchemaType } from '../types.js';

/**
 * Create a handler for fetching a schema by type
 * @param schemaTypes - Array of schema type definitions
 */
export function createSchemaByTypeHandler(schemaTypes: SchemaType[]): RequestHandler {
	return async ({ params }) => {
		const { type } = params;

		if (!type) {
			return new Response(JSON.stringify({ error: 'Schema type is required' }), {
				status: 400,
				headers: { 'content-type': 'application/json' }
			});
		}

		// Find the schema by name
		const schema = schemaTypes.find((s) => s.name === type);

		if (!schema) {
			return new Response(JSON.stringify({ error: `Schema type '${type}' not found` }), {
				status: 404,
				headers: { 'content-type': 'application/json' }
			});
		}

		// Return the schema definition
		return new Response(
			JSON.stringify({
				success: true,
				data: schema
			}),
			{
				headers: { 'content-type': 'application/json' }
			}
		);
	};
}
