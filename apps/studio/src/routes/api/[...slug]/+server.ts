import type { RequestHandler } from '@sveltejs/kit';

/**
 * Catch-all forwarder: any `/api/**` request that doesn't match a specific
 * `+server.ts` falls through here and gets handed to the Aphex Hono app.
 *
 * SvelteKit prefers specific routes over catch-alls, so existing per-endpoint
 * shims continue to win during the migration. Once a route is ported into
 * the Hono app, deleting its specific `+server.ts` flips traffic over.
 */
const handler: RequestHandler = ({ request, locals, getClientAddress }) => {
	const apiApp = locals.aphexCMS?.apiApp;
	if (!apiApp) {
		return new Response('CMS not initialized', { status: 503 });
	}

	try {
		request.headers.set('x-forwarded-for', getClientAddress());
	} catch {
		// Some runtimes expose immutable Request headers; non-fatal.
	}

	return apiApp.fetch(request, {
		aphexCMS: locals.aphexCMS,
		auth: locals.auth ?? null
	});
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
export const HEAD = handler;
