// Aphex CMS Schema API Handlers - Get schema by type
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals, params }) => {
	const { type } = params;
	const { cmsEngine } = locals.aphexCMS;

	if (!type) {
		return new Response(JSON.stringify({ error: 'Schema type is required' }), {
			status: 400,
			headers: { 'content-type': 'application/json' }
		});
	}

	console.log("GETTING SCHEMA TYPE FROM: ", type)
	const schema = await cmsEngine.getSchemaType(type);
	console.log("SCHEMA: ", schema)

	if (!schema) {
		return new Response(JSON.stringify({ error: `Schema type '${type}' not found` }), {
			status: 404,
			headers: { 'content-type': 'application/json' }
		});
	}

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
