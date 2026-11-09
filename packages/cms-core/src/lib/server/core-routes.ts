import type { RequestEvent } from '@sveltejs/kit';
import { GET as serveAsset } from '../routes/assets-cdn';

const MEDIA_PATH = /^\/media\/([^/]+)\/([^/]+)$/;

/**
 * The routes core answers from the hook, so a host needs no route file for them. A
 * route the host did define matched before the hook ran and wins, whether that's its
 * own `/api/orders` or an older `/api/[...slug]` that forwards here.
 */
export async function serveCoreRoute(event: RequestEvent): Promise<Response | null> {
	if (event.route.id !== null) return null;

	const { pathname } = event.url;

	if (pathname === '/api' || pathname.startsWith('/api/')) {
		return event.locals.aphexCMS.apiApp.fetch(event.request, {
			aphexCMS: event.locals.aphexCMS,
			auth: event.locals.aphexAuth ?? null,
			clientAddress: clientAddressOrUndefined(event.getClientAddress)
		});
	}

	const { method } = event.request;
	const [, id, filename] = MEDIA_PATH.exec(pathname) ?? [];
	if (id && filename && (method === 'GET' || method === 'HEAD')) {
		return serveMedia(event, id, filename);
	}

	return null;
}

/**
 * `getClientAddress()` throws when the address can't be determined: a dev socket with
 * no `remoteAddress`, or an adapter's `ADDRESS_HEADER` missing from this request. That
 * shouldn't fail the request, because rate limiting reads the headers directly and the
 * one consumer of this value has a fallback.
 */
function clientAddressOrUndefined(getClientAddress: () => string): string | undefined {
	try {
		return getClientAddress();
	} catch {
		return undefined;
	}
}

async function serveMedia(event: RequestEvent, id: string, filename: string): Promise<Response> {
	// SvelteKit only applies `setHeaders` to a response from a route, and this isn't one.
	const headers = new Headers();
	const response = await serveAsset({
		locals: event.locals,
		request: event.request,
		params: { id: safeDecode(id), filename: safeDecode(filename) },
		setHeaders: (values) => {
			for (const [name, value] of Object.entries(values)) headers.set(name, value);
		}
	});

	response.headers.forEach((value, name) => headers.set(name, value));
	return new Response(event.request.method === 'HEAD' ? null : response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}

/** A malformed escape can't name a real asset, so it reaches the 404 undecoded. */
function safeDecode(segment: string): string {
	try {
		return decodeURIComponent(segment);
	} catch {
		return segment;
	}
}
