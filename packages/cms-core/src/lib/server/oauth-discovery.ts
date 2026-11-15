import type { RequestEvent } from '@sveltejs/kit';
import { OAUTH_SCOPES } from '../types/capabilities';

const PROTECTED_RESOURCE = '/.well-known/oauth-protected-resource';
const AUTHORIZATION_SERVER = '/.well-known/oauth-authorization-server';

/**
 * How an MCP client finds out how to sign in to `/mcp`, when the auth provider
 * offers OAuth (`provider.oauth`):
 *
 * 1. `/mcp` answers 401 with `WWW-Authenticate: Bearer resource_metadata=…`.
 * 2. The protected resource metadata (RFC 9728) names `/mcp` and its authorization
 *    server.
 * 3. The authorization server metadata (RFC 8414) lives at the root with the
 *    issuer's path appended (`/.well-known/oauth-authorization-server/api/auth`),
 *    which is where clients look for an issuer with a path. Served bare as well, for
 *    clients that only try the root.
 *
 * Both are open to any origin: browser-based clients read them cross-origin.
 */
export async function serveOAuthDiscovery(event: RequestEvent): Promise<Response | null> {
	const { pathname } = event.url;
	const wanted = pathname.startsWith(PROTECTED_RESOURCE)
		? 'resource'
		: pathname.startsWith(AUTHORIZATION_SERVER)
			? 'server'
			: null;
	if (!wanted) return null;
	const oauth = event.locals.aphexCMS?.auth?.oauth;
	if (!oauth) return null;

	const metadata = await oauth.metadata();
	if (wanted === 'server') return json(metadata);

	const issuer = String(metadata.issuer);
	return json({
		resource: mcpResource(issuer),
		authorization_servers: [issuer],
		scopes_supported: Object.keys(OAUTH_SCOPES),
		bearer_methods_supported: ['header']
	});
}

/** `/mcp` on the issuer's origin: the one address tokens are issued for. */
export function mcpResource(issuer: string): string {
	return `${new URL(issuer).origin}/mcp`;
}

/** The `WWW-Authenticate` value a 401 from `/mcp` carries, pointing at the metadata. */
export function mcpWwwAuthenticate(issuer: string): string {
	return `Bearer resource_metadata="${new URL(issuer).origin}${PROTECTED_RESOURCE}/mcp"`;
}

function json(body: unknown): Response {
	return new Response(JSON.stringify(body), {
		headers: {
			'content-type': 'application/json',
			'access-control-allow-origin': '*',
			'cache-control': 'public, max-age=300'
		}
	});
}
