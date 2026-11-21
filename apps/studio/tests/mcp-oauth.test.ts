/**
 * Connecting an app (Claude, ChatGPT) to `/mcp` with OAuth, end to end against a real
 * auth instance and database: discovery, dynamic registration, authorize with PKCE,
 * choosing the site, consent, the token, and then what the token can and can't do.
 *
 * Run: pnpm -F @aphexcms/studio test mcp-oauth
 */
import { createHash, randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAphexAuth } from '@aphexcms/auth';
import { createLocalAPI, RolesService, type AuthProvider } from '@aphexcms/cms-core/server';
import { serveOAuthDiscovery } from '@aphexcms/cms-core/server/oauth-discovery';
import { POST as mcp } from '@aphexcms/cms-core/routes/mcp';
import { db, drizzleDb, dbDialect } from './helpers/db';
import cmsConfig from './fixtures/config';
import { TEST_ORG_ID } from './helpers/test-constants';

const ORIGIN = 'http://localhost:5173';
const ISSUER = `${ORIGIN}/api/auth`;
const RESOURCE = `${ORIGIN}/admin/mcp`;
/** Where the MCP server lived first, still served for clients set up with it. */
const FIRST_RESOURCE = `${ORIGIN}/mcp`;
const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';
const SCOPE = 'aphex:read aphex:write offline_access';

const { auth, provider } = createAphexAuth({
	database: db,
	drizzleDb,
	dialect: dbDialect,
	secret: 'mcp-oauth-test-secret-at-least-32-characters',
	baseURL: ORIGIN,
	options: { inviteOnly: false },
	oauth: { enabled: true }
});
const oauth = provider.oauth!;

const email = `oauth-${Date.now()}@example.com`;
let cookie = '';
let userId = '';

/** better-auth over HTTP, as a browser or an MCP client would reach it. */
function http(path: string, init: RequestInit & { form?: Record<string, string> } = {}) {
	const headers = new Headers(init.headers);
	let body = init.body;
	if (init.form) {
		headers.set('content-type', 'application/x-www-form-urlencoded');
		body = new URLSearchParams(init.form).toString();
	}
	return auth.handler(new Request(`${ORIGIN}${path}`, { ...init, headers, body }));
}

const signedIn = (path = '/admin') => new Request(`${ORIGIN}${path}`, { headers: { cookie } });

function pkce() {
	const verifier = randomBytes(32).toString('base64url');
	const challenge = createHash('sha256').update(verifier).digest('base64url');
	return { verifier, challenge };
}

/** Registration is limited per address (10 a minute), so each test client comes from its own. */
let registrations = 0;

async function register(redirectUris = [REDIRECT]) {
	registrations += 1;
	return http('/api/auth/oauth2/register', {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${registrations}` },
		body: JSON.stringify({
			client_name: 'Claude',
			redirect_uris: redirectUris,
			token_endpoint_auth_method: 'none',
			grant_types: ['authorization_code', 'refresh_token'],
			response_types: ['code']
		})
	});
}

function authorizeUrl(clientId: string, challenge: string, state = 'state-1') {
	const query = new URLSearchParams({
		response_type: 'code',
		client_id: clientId,
		redirect_uri: REDIRECT,
		scope: SCOPE,
		state,
		code_challenge: challenge,
		code_challenge_method: 'S256',
		resource: RESOURCE
	});
	return `/api/auth/oauth2/authorize?${query}`;
}

/** The signed query a redirect to one of the admin's OAuth pages carries. */
function pageQuery(location: string | null, page: string): string {
	expect(location).toBeTruthy();
	const url = new URL(location!, ORIGIN);
	expect(url.pathname).toBe(page);
	return url.search.slice(1);
}

/** Authorize, pick the site, allow: the code the app gets back. */
async function connect(organizationId = TEST_ORG_ID) {
	const { body: client } = await register().then(async (r) => ({ body: await r.json() }));
	const { verifier, challenge } = pkce();
	const started = await http(authorizeUrl(client.client_id, challenge), { headers: { cookie } });
	const siteQuery = pageQuery(started.headers.get('location'), '/admin/oauth/site');

	const { url: consentUrl } = await oauth.chooseOrganization(signedIn(), siteQuery, organizationId);
	const consentQuery = pageQuery(consentUrl, '/admin/oauth/consent');
	const { url: back } = await oauth.consent(signedIn(), consentQuery, true);
	const code = new URL(back).searchParams.get('code')!;
	return { clientId: client.client_id as string, verifier, code, back, consentQuery };
}

async function exchange(
	clientId: string,
	code: string,
	verifier: string,
	resource = RESOURCE
): Promise<Response> {
	return http('/api/auth/oauth2/token', {
		method: 'POST',
		form: {
			grant_type: 'authorization_code',
			code,
			redirect_uri: REDIRECT,
			client_id: clientId,
			code_verifier: verifier,
			resource
		}
	});
}

/** `/mcp` as the route serves it, with this test's real auth provider. */
function mcpLocals(tenant?: { id: string; name: string }) {
	const config = {
		...cmsConfig,
		auth: { ...cmsConfig.auth, provider: provider as AuthProvider }
	};
	return {
		aphexCMS: {
			config,
			databaseAdapter: db,
			localAPI: createLocalAPI(config as never, db),
			rolesService: new RolesService(db, null),
			partResolver: {
				agentToolsForCapabilities: () => [],
				agentInstructionsForCapabilities: () => []
			}
		},
		...(tenant ? { aphexTenant: 'x', aphexTenantOrganization: tenant } : {})
	} as unknown as App.Locals;
}

async function callMcp(
	token: string | null,
	method: string,
	params: Record<string, unknown> = {},
	locals = mcpLocals(),
	url = RESOURCE
) {
	const request = new Request(url, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			accept: 'application/json, text/event-stream',
			...(token ? { authorization: `Bearer ${token}` } : {})
		},
		body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
	});
	const response = await mcp({ request, locals } as never);
	const text = await response.text();
	const data = text.startsWith('{') ? text : (text.match(/^data: (.*)$/m)?.[1] ?? '{}');
	return { response, body: JSON.parse(data) };
}

beforeAll(async () => {
	const signUp = await http('/api/auth/sign-up/email', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email, password: 'oauth-test-password-1', name: 'OAuth Test' })
	});
	expect(signUp.status).toBe(200);
	cookie = (signUp.headers.getSetCookie?.() ?? [signUp.headers.get('set-cookie') ?? ''])
		.map((c) => c.split(';')[0])
		.join('; ');
	userId = (await signUp.json()).user.id;
	await db.addMember({ organizationId: TEST_ORG_ID, userId, role: 'editor' });
});

afterAll(async () => {
	await db.removeMember(TEST_ORG_ID, userId).catch(() => {});
});

describe('discovery', () => {
	it('serves the authorization server metadata, with its issuer and the iss parameter', async () => {
		const metadata = await oauth.metadata();
		expect(metadata.issuer).toBe(ISSUER);
		expect(metadata.registration_endpoint).toBe(`${ISSUER}/oauth2/register`);
		expect(metadata.code_challenge_methods_supported).toContain('S256');
		expect(metadata.authorization_response_iss_parameter_supported).toBe(true);
	});

	it('serves the protected resource metadata for /admin/mcp at the root', async () => {
		const event = {
			url: new URL(`${ORIGIN}/.well-known/oauth-protected-resource/admin/mcp`),
			locals: { aphexCMS: { auth: provider } }
		};
		const response = await serveOAuthDiscovery(event as never);
		expect(response?.headers.get('access-control-allow-origin')).toBe('*');
		const body = await response!.json();
		expect(body.resource).toBe(RESOURCE);
		expect(body.authorization_servers).toEqual([ISSUER]);
		expect(body.scopes_supported).toEqual(['aphex:read', 'aphex:write', 'offline_access']);

		const server = await serveOAuthDiscovery({
			...event,
			url: new URL(`${ORIGIN}/.well-known/oauth-authorization-server/api/auth`)
		} as never);
		expect((await server!.json()).issuer).toBe(ISSUER);
	});

	it("names /mcp as the resource in /mcp's own metadata, as a client checks", async () => {
		const response = await serveOAuthDiscovery({
			url: new URL(`${ORIGIN}/.well-known/oauth-protected-resource/mcp`),
			locals: { aphexCMS: { auth: provider } }
		} as never);
		expect((await response!.json()).resource).toBe(FIRST_RESOURCE);
	});

	it('describes no resource when the app turns MCP off, and still describes the server', async () => {
		const locals = { aphexCMS: { auth: provider, config: { mcp: { enabled: false } } } };
		const resource = await serveOAuthDiscovery({
			url: new URL(`${ORIGIN}/.well-known/oauth-protected-resource/admin/mcp`),
			locals
		} as never);
		expect(resource).toBeNull();
		const server = await serveOAuthDiscovery({
			url: new URL(`${ORIGIN}/.well-known/oauth-authorization-server/api/auth`),
			locals
		} as never);
		expect((await server!.json()).issuer).toBe(ISSUER);
	});

	it('answers an unauthenticated call with where to sign in, at either address', async () => {
		const { response } = await callMcp(null, 'tools/list');
		expect(response.status).toBe(401);
		expect(response.headers.get('www-authenticate')).toBe(
			`Bearer resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource/admin/mcp"`
		);
		const first = await callMcp(null, 'tools/list', {}, mcpLocals(), FIRST_RESOURCE);
		expect(first.response.headers.get('www-authenticate')).toBe(
			`Bearer resource_metadata="${ORIGIN}/.well-known/oauth-protected-resource/mcp"`
		);
	});
});

describe('registration', () => {
	it('lets a public client register itself', async () => {
		const response = await register();
		expect(response.status).toBe(200);
		const client = await response.json();
		expect(client.client_id).toBeTruthy();
		expect(client.client_secret).toBeUndefined();
	});

	it('refuses a plain-http redirect that is not on this machine', async () => {
		const response = await register(['http://attacker.example/callback']);
		expect(response.status).toBe(400);
	});
});

describe('authorizing', () => {
	it('sends someone signed out to sign in first', async () => {
		const client = await (await register()).json();
		const response = await http(authorizeUrl(client.client_id, pkce().challenge));
		pageQuery(response.headers.get('location'), '/admin/oauth/login');
	});

	it('asks which site, then for consent, then returns a code and the issuer', async () => {
		const { back, consentQuery } = await connect();
		const url = new URL(back);
		expect(url.origin + url.pathname).toBe(REDIRECT);
		expect(url.searchParams.get('state')).toBe('state-1');
		expect(url.searchParams.get('iss')).toBe(ISSUER);

		const shown = await oauth.authorization(signedIn(), consentQuery);
		expect(shown?.client.name).toBe('Claude');
		expect(shown?.organizationId).toBe(TEST_ORG_ID);
		expect(shown?.scopes).toEqual(SCOPE.split(' '));
	});

	it("won't record a site the user isn't a member of", async () => {
		const client = await (await register()).json();
		const started = await http(authorizeUrl(client.client_id, pkce().challenge), {
			headers: { cookie }
		});
		const siteQuery = pageQuery(started.headers.get('location'), '/admin/oauth/site');
		await expect(
			oauth.chooseOrganization(signedIn(), siteQuery, '00000000-0000-4000-8000-000000000000')
		).rejects.toThrow(/not a member/);
	});

	it('returns access_denied to the app when the user says no', async () => {
		const client = await (await register()).json();
		const started = await http(authorizeUrl(client.client_id, pkce().challenge), {
			headers: { cookie }
		});
		const siteQuery = pageQuery(started.headers.get('location'), '/admin/oauth/site');
		const { url: consentUrl } = await oauth.chooseOrganization(signedIn(), siteQuery, TEST_ORG_ID);
		const { url } = await oauth.consent(
			signedIn(),
			pageQuery(consentUrl, '/admin/oauth/consent'),
			false
		);
		expect(new URL(url).searchParams.get('error')).toBe('access_denied');
	});
});

describe('the token', () => {
	it('is issued only for the MCP server', async () => {
		const { clientId, code, verifier } = await connect();
		const response = await exchange(clientId, code, verifier, 'https://elsewhere.example/mcp');
		expect(response.status).toBe(400);
	});

	it('is issued for /mcp too, for clients set up with it', async () => {
		const { clientId, code, verifier } = await connect();
		const issued = await exchange(clientId, code, verifier, FIRST_RESOURCE);
		expect(issued.status).toBe(200);
		const { access_token } = await issued.json();
		const listed = await callMcp(access_token, 'tools/list', {}, mcpLocals(), FIRST_RESOURCE);
		expect(listed.response.status).toBe(200);
	});

	it('reads and writes drafts over /mcp, never publishes, and stops when disconnected', async () => {
		const { clientId, code, verifier } = await connect();
		const issued = await exchange(clientId, code, verifier);
		expect(issued.status).toBe(200);
		const { access_token, refresh_token } = await issued.json();
		expect(access_token).toMatch(/^aphex_at_/);
		expect(refresh_token).toMatch(/^aphex_rt_/);

		const listed = await callMcp(access_token, 'tools/list');
		expect(listed.response.status).toBe(200);
		const names = listed.body.result.tools.map((tool: { name: string }) => tool.name);
		expect(names).toContain('create_document');
		expect(names).not.toContain('publish_document');

		const created = await callMcp(access_token, 'tools/call', {
			name: 'create_document',
			arguments: { collection: 'page', data: { title: 'Written by Claude', slug: 'by-claude' } }
		});
		expect(created.body.result.isError, created.body.result.content[0].text).toBeFalsy();
		const { id } = JSON.parse(created.body.result.content[0].text).document;

		const published = await callMcp(access_token, 'tools/call', {
			name: 'publish_document',
			arguments: { id }
		});
		expect(published.body.result?.isError ?? published.body.error).toBeTruthy();

		// Nor by creating it published.
		const live = await callMcp(access_token, 'tools/call', {
			name: 'create_document',
			arguments: { collection: 'page', data: { title: 'Live?', slug: 'live' }, publish: true }
		});
		expect(live.body.result.isError).toBe(true);

		const elsewhere = await callMcp(
			access_token,
			'tools/list',
			{},
			mcpLocals({ id: 'another-org', name: 'Another site' })
		);
		expect(elsewhere.response.status).toBe(403);

		// Removing the user from the organization ends the token's access at once.
		await db.removeMember(TEST_ORG_ID, userId);
		expect((await callMcp(access_token, 'tools/list')).response.status).toBe(401);
		await db.addMember({ organizationId: TEST_ORG_ID, userId, role: 'editor' });
		expect((await callMcp(access_token, 'tools/list')).response.status).toBe(200);

		const connections = await oauth.listConnections(userId, TEST_ORG_ID);
		expect(connections.map((c) => c.clientId)).toContain(clientId);
		expect(await oauth.disconnect(userId, TEST_ORG_ID, clientId)).toBe(true);
		expect((await callMcp(access_token, 'tools/list')).response.status).toBe(401);

		await localCleanup(id);
	});

	it('publishes only once the user allows it, for that app alone', async () => {
		const { clientId, code, verifier } = await connect();
		const { access_token } = await (await exchange(clientId, code, verifier)).json();
		const tools = async () =>
			(await callMcp(access_token, 'tools/list')).body.result.tools.map(
				(tool: { name: string }) => tool.name
			);
		expect(await tools()).not.toContain('publish_document');

		// Only opt-in capabilities are stored, whatever is sent.
		expect(
			await oauth.setAllowed(userId, TEST_ORG_ID, clientId, ['document.publish', 'member.invite'])
		).toBe(true);
		const [connection] = (await oauth.listConnections(userId, TEST_ORG_ID)).filter(
			(c) => c.clientId === clientId
		);
		expect(connection.allowed).toEqual(['document.publish']);
		expect(connection.scopes).toEqual(SCOPE.split(' '));

		// From the very next call.
		expect(await tools()).toContain('publish_document');
		const created = await callMcp(access_token, 'tools/call', {
			name: 'create_document',
			arguments: { collection: 'page', data: { title: 'Allowed to go live', slug: 'allowed-live' } }
		});
		const { id } = JSON.parse(created.body.result.content[0].text).document;
		const published = await callMcp(access_token, 'tools/call', {
			name: 'publish_document',
			arguments: { collection: 'page', id }
		});
		expect(published.body.result.isError, published.body.result.content[0].text).toBeFalsy();

		// Another app the same user connected is still drafts only.
		const other = await connect();
		const { access_token: otherToken } = await (
			await exchange(other.clientId, other.code, other.verifier)
		).json();
		const otherTools = (await callMcp(otherToken, 'tools/list')).body.result.tools.map(
			(tool: { name: string }) => tool.name
		);
		expect(otherTools).not.toContain('publish_document');

		// Switched off: gone again on the next call.
		await oauth.setAllowed(userId, TEST_ORG_ID, clientId, []);
		expect(await tools()).not.toContain('publish_document');

		// Authorizing the same app again (a token renewal) keeps what was allowed.
		await oauth.setAllowed(userId, TEST_ORG_ID, clientId, ['document.publish']);
		const { challenge } = pkce();
		const again = await http(authorizeUrl(clientId, challenge, 'state-2'), { headers: { cookie } });
		const siteQuery = pageQuery(again.headers.get('location'), '/admin/oauth/site');
		const { url: next } = await oauth.chooseOrganization(signedIn(), siteQuery, TEST_ORG_ID);
		// Already consented to: straight back to the app, no consent page.
		expect(new URL(next, ORIGIN).href.startsWith(REDIRECT)).toBe(true);
		const [renewed] = (await oauth.listConnections(userId, TEST_ORG_ID)).filter(
			(c) => c.clientId === clientId
		);
		expect(renewed.allowed).toEqual(['document.publish']);

		await oauth.disconnect(userId, TEST_ORG_ID, clientId);
		await oauth.disconnect(userId, TEST_ORG_ID, other.clientId);
		await localCleanup(id);
	});
});

async function localCleanup(id: string) {
	const api = createLocalAPI(cmsConfig, db);
	await api.collections.page
		.delete({ organizationId: TEST_ORG_ID, overrideAccess: true }, id)
		.catch(() => {});
}
