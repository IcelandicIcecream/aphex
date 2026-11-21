import type { RequestEvent } from '@sveltejs/kit';
import { OAUTH_SCOPES } from '../types/capabilities';
import { MCP_PATH, isMcpEnabled, isMcpPath } from '../mcp/paths';

const PROTECTED_RESOURCE = '/.well-known/oauth-protected-resource';
const AUTHORIZATION_SERVER = '/.well-known/oauth-authorization-server';

/**
 * How an MCP client finds out how to sign in to `/admin/mcp`, when the auth provider
 * offers OAuth (`provider.oauth`):
 *
 * 1. `/admin/mcp` answers 401 with `WWW-Authenticate: Bearer resource_metadata=…`.
 * 2. The protected resource metadata (RFC 9728), at the well-known path followed by
 *    the resource's own (`…/oauth-protected-resource/admin/mcp`), names the resource
 *    and its authorization server. `/mcp`, the server's first address, gets its own,
 *    as a client checks that the resource named is the URL it was given.
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

	// The resource is the MCP server, so with it off there's nothing to describe.
	if (wanted === 'resource' && !isMcpEnabled(event.locals.aphexCMS?.config)) return null;

	const metadata = await oauth.metadata();
	if (wanted === 'server') return json(metadata);

	const issuer = String(metadata.issuer);
	const suffix = pathname.slice(PROTECTED_RESOURCE.length);
	return json({
		resource: mcpResource(issuer, isMcpPath(suffix) ? suffix : MCP_PATH),
		authorization_servers: [issuer],
		scopes_supported: Object.keys(OAUTH_SCOPES),
		bearer_methods_supported: ['header']
	});
}

/** The MCP server's URL on the issuer's origin: what tokens are issued for. */
export function mcpResource(issuer: string, path: string = MCP_PATH): string {
	return `${new URL(issuer).origin}${path}`;
}

/** The `WWW-Authenticate` value a 401 from the MCP server carries, pointing at its metadata. */
export function mcpWwwAuthenticate(issuer: string, path: string = MCP_PATH): string {
	const resource = isMcpPath(path) ? path : MCP_PATH;
	return `Bearer resource_metadata="${new URL(issuer).origin}${PROTECTED_RESOURCE}${resource}"`;
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
