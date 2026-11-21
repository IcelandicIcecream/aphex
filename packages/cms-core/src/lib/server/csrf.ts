/**
 * SvelteKit's cross-site form check, run by core so a few paths can be exempt.
 *
 * SvelteKit refuses any cross-site form POST (and any without an `Origin` header) in
 * production, before a hook can see it. OAuth needs exactly that: a client's server
 * exchanges its code at the token endpoint with a form-encoded POST and no `Origin`
 * (RFC 6749 §4.1.3). SvelteKit can't exempt one path, only every origin, so an app
 * that offers OAuth sets `csrf: { trustedOrigins: ['*'] }` in `svelte.config.js` and
 * this takes over: the same rule, for every request, minus the endpoints a client
 * calls from its server. Those are safe to exempt: they act on no browser session.
 *
 * Kept in step with `@sveltejs/kit/src/runtime/server/respond.js`.
 */

const FORM_CONTENT_TYPES = [
	'application/x-www-form-urlencoded',
	'multipart/form-data',
	'text/plain',
	'application/x-sveltekit-formdata'
];
const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

export interface CrossSiteFormOptions {
	/** Origins allowed to post forms here, as SvelteKit's `csrf.trustedOrigins`. */
	trustedOrigins?: readonly string[];
	/** Paths any origin may post to: the OAuth endpoints clients call from their servers. */
	exemptPaths?: readonly string[];
}

/** A 403 for a cross-site form submission, as SvelteKit would give, or null to let it through. */
export function refuseCrossSiteForm(
	request: Request,
	url: URL,
	options: CrossSiteFormOptions = {}
): Response | null {
	if (!UNSAFE_METHODS.includes(request.method)) return null;
	const type = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
	if (!FORM_CONTENT_TYPES.includes(type)) return null;

	const origin = request.headers.get('origin');
	if (origin === url.origin) return null;
	if (origin && options.trustedOrigins?.includes(origin)) return null;
	if (options.exemptPaths?.includes(url.pathname)) return null;

	const message = `Cross-site ${request.method} form submissions are forbidden`;
	return request.headers.get('accept') === 'application/json'
		? new Response(JSON.stringify({ message }), {
				status: 403,
				headers: { 'content-type': 'application/json' }
			})
		: new Response(message, { status: 403 });
}
