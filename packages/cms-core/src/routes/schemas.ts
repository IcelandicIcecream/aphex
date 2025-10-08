// Aphex CMS Schema API Handlers
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
	const { cmsEngine } = locals.aphexCMS;
	const schemas = await cmsEngine.listSchemas();

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
