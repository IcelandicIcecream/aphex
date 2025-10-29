// Aphex CMS Schema API Handlers
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
	const { cmsEngine } = locals.aphexCMS;

	// Get schemas from config (not database) to preserve validation functions
	const schemas = cmsEngine.config.schemaTypes;

	return new Response(
		JSON.stringify({
			success: true,
			data: schemas
		}),
		{
			headers: { 'content-type': 'application/json' }
		}
	);
};
