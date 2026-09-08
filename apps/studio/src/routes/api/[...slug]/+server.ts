import type { RequestHandler } from '@sveltejs/kit';

/**
 * Catch-all forwarder: any `/api/**` request that doesn't match a specific
 * `+server.ts` falls through here and gets handed to the Aphex Hono app.
 *
 * SvelteKit prefers specific routes over catch-alls, so existing per-endpoint
 * shims continue to win during the migration. Once a route is ported into
 * the Hono app, deleting its specific `+server.ts` flips traffic over.
 */
/**
 * `getClientAddress()` **throws** when the address can't be determined, rather
 * than returning null — a dev-server socket with no `remoteAddress`, or
 * adapter-node configured with an `ADDRESS_HEADER` this request didn't carry.
 * Called eagerly below, that turned an unknowable IP into a 500 for *every*
 * `/api/**` request, which is a bad trade for a value almost nothing reads:
 * rate limiting keys off `x-forwarded-for`/`x-real-ip` taken straight from the
 * headers, and the one consumer of this field (the synthesized event in
 * cms-core's `toHonoHandler`) already falls back to `127.0.0.1`.
 *
 * So an undeterminable address is `undefined` and the request proceeds.
 */
function clientAddressOrUndefined(getClientAddress: () => string): string | undefined {
	try {
		return getClientAddress();
	} catch {
		return undefined;
	}
}

const handler: RequestHandler = ({ request, locals, getClientAddress }) => {
	const apiApp = locals.aphexCMS?.apiApp;
	if (!apiApp) {
		return new Response('CMS not initialized', { status: 503 });
	}

	return apiApp.fetch(request, {
		aphexCMS: locals.aphexCMS,
		auth: locals.auth ?? null,
		clientAddress: clientAddressOrUndefined(getClientAddress)
	});
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const OPTIONS = handler;
export const HEAD = handler;
