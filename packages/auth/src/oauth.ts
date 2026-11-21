/**
 * OAuth 2.1 for `/mcp`: how Claude, ChatGPT and other MCP clients connect.
 *
 * `@better-auth/oauth-provider` does the protocol (discovery, dynamic client
 * registration, PKCE, codes, tokens, consent records). This file adds what Aphex
 * needs on top:
 *
 * - **Which organization.** After signing in, the user picks the site the app may
 *   reach (`/admin/oauth/site`). The choice is stored for this session and this one
 *   authorization (its PKCE challenge), and becomes the consent's and every token's
 *   `referenceId`. A token never reaches any other organization.
 * - **Tokens we can check ourselves.** Opaque, prefixed, stored as a SHA-256 hash we
 *   compute here, so `/mcp` looks them up directly and revoking is immediate.
 * - **Scopes in Aphex's terms** (`aphex:read`, `aphex:write`), turned into
 *   capabilities by `oauthScopeCapabilities` in core.
 * - **Opt-ins.** What the user switches on for one app beyond its scopes (publishing,
 *   deleting) is kept on its consent as `aphex:allow:<capability>` entries, read on
 *   every call. Authorizing the same app again keeps them (it's the same consent); the
 *   plugin rewrites a consent's scopes only when it asks for consent again (new scopes),
 *   which switches them off. Disconnecting deletes the consent, and with it them all.
 */
import { APIError } from 'better-auth/api';
import { oauthProvider, getOAuthProviderState } from '@better-auth/oauth-provider';
import { OAUTH_SCOPES, isOAuthOptInCapability, oauthScopeCapabilities } from '@aphexcms/cms-core';
import type { DatabaseAdapter, OAuthConnection, OAuthServer } from '@aphexcms/cms-core/server';
import { ownerGrantableCapabilities } from './service.js';
import type { AphexAuthInstance } from './instance.js';

/** Access tokens start with this, so `/mcp` can tell one from an API key at a glance. */
export const OAUTH_ACCESS_TOKEN_PREFIX = 'aphex_at_';
const OAUTH_REFRESH_TOKEN_PREFIX = 'aphex_rt_';
/** A consent's scopes entry recording one capability the user switched on for the app. */
const ALLOW_PREFIX = 'aphex:allow:';

/** A consent's scopes, split into the real scopes and what the user switched on. */
function splitConsentScopes(entries: string[]): { scopes: string[]; allowed: string[] } {
	const scopes: string[] = [];
	const allowed: string[] = [];
	for (const entry of entries) {
		if (!entry.startsWith(ALLOW_PREFIX)) scopes.push(entry);
		else if (isOAuthOptInCapability(entry.slice(ALLOW_PREFIX.length)))
			allowed.push(entry.slice(ALLOW_PREFIX.length));
	}
	return { scopes, allowed };
}

/** How long an authorization in progress (and its site choice) stays valid. */
const AUTHORIZATION_TTL_SECONDS = 600;

export const OAUTH_SCOPE_LIST = Object.keys(OAUTH_SCOPES) as Array<keyof typeof OAUTH_SCOPES>;

/** The admin pages the flow sends the browser to. */
export const OAUTH_PAGES = {
	login: '/admin/oauth/login',
	site: '/admin/oauth/site',
	consent: '/admin/oauth/consent'
} as const;

export async function hashOAuthToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return Buffer.from(digest).toString('base64url');
}

/** The verification-table key holding one authorization's chosen organization. */
export function siteChoiceIdentifier(sessionId: string, oauthQuery: string): string {
	const query = new URLSearchParams(oauthQuery);
	// PKCE is required for every client registered here, so the challenge is unique
	// per authorization: a later connection in the same session asks again.
	const attempt = query.get('code_challenge') ?? query.get('state') ?? '';
	return `aphex-oauth-site:${sessionId}:${query.get('client_id') ?? ''}:${attempt}`;
}

/**
 * A redirect URI a client may register: https, a loopback address for a local
 * client, or an app's own scheme (`cursor://…`). Plain http elsewhere would send
 * the code over the network in the clear.
 */
export function isAllowedRedirectUri(uri: string): boolean {
	let url: URL;
	try {
		url = new URL(uri);
	} catch {
		return false;
	}
	if (url.protocol === 'https:') return true;
	if (url.protocol === 'http:') {
		return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
	}
	return !['javascript:', 'data:', 'vbscript:', 'file:'].includes(url.protocol);
}

interface VerificationStore {
	findVerificationValue(identifier: string): Promise<{ value: string; expiresAt: Date } | null>;
}

export interface OAuthPluginDeps {
	database: DatabaseAdapter;
	/** The auth instance's internal adapter, which exists only once it's built. */
	verification: () => Promise<VerificationStore>;
	/** The MCP server's URLs (`<origin>/admin/mcp`, `<origin>/mcp`): what tokens may be for. */
	resources: readonly string[];
}

/** The organization chosen for this authorization, if the user is still a member of it. */
export async function chosenOrganization(
	deps: Pick<OAuthPluginDeps, 'database' | 'verification'>,
	userId: string,
	sessionId: string,
	oauthQuery: string
): Promise<string | null> {
	const store = await deps.verification();
	const row = await store.findVerificationValue(siteChoiceIdentifier(sessionId, oauthQuery));
	if (!row || new Date(row.expiresAt) < new Date()) return null;
	const organizationId = row.value;
	const membership = await deps.database.findUserMembership(userId, organizationId);
	return membership ? organizationId : null;
}

export function createOAuthPlugin(deps: OAuthPluginDeps) {
	const currentQuery = async () => (await getOAuthProviderState())?.query ?? '';

	return oauthProvider({
		loginPage: OAUTH_PAGES.login,
		consentPage: OAUTH_PAGES.consent,
		// Opaque tokens, checked against the database on every `/mcp` call: no signing
		// keys to run, and disconnecting an app works on its very next request.
		disableJwtPlugin: true,
		storeTokens: { hash: hashOAuthToken },
		prefix: {
			opaqueAccessToken: OAUTH_ACCESS_TOKEN_PREFIX,
			refreshToken: OAUTH_REFRESH_TOKEN_PREFIX
		},
		scopes: OAUTH_SCOPE_LIST,
		validAudiences: [...deps.resources],
		allowDynamicClientRegistration: true,
		// Claude and ChatGPT register themselves without an account here, as public
		// clients (PKCE, no secret).
		allowUnauthenticatedClientRegistration: true,
		clientRegistrationDefaultScopes: OAUTH_SCOPE_LIST,
		clientRegistrationAllowedScopes: OAUTH_SCOPE_LIST,
		codeExpiresIn: AUTHORIZATION_TTL_SECONDS,
		silenceWarnings: { oauthAuthServerConfig: true, openidConfig: true },
		postLogin: {
			page: OAUTH_PAGES.site,
			shouldRedirect: async ({ user, session }) =>
				!(await chosenOrganization(deps, user.id, session.id, await currentQuery())),
			consentReferenceId: async ({ user, session }) => {
				const organizationId = await chosenOrganization(
					deps,
					user.id,
					session.id,
					await currentQuery()
				);
				// Never a grant without an organization: it would reach nothing, or worse,
				// whatever a later default picked.
				if (!organizationId) {
					throw new APIError('BAD_REQUEST', {
						error: 'invalid_request',
						error_description: 'Choose the site this app may use.'
					});
				}
				return organizationId;
			}
		}
	});
}

/**
 * Rules on top of the plugin's own validation, and the switch when OAuth is off: the
 * plugin is always registered (the instance's plugin list is fixed), so `enabled`
 * decides whether its endpoints answer at all. Runs in the instance's `before` hook.
 */
export function checkOAuthRequest(enabled: boolean, ctx: { path: string; body?: any }): void {
	const isOAuthPath = ctx.path.startsWith('/oauth2/') || ctx.path.startsWith('/.well-known/');
	if (!isOAuthPath) return;
	if (!enabled) {
		throw new APIError('NOT_FOUND', { message: 'OAuth is not enabled on this instance.' });
	}
	if (ctx.path === '/oauth2/register') {
		const uris: unknown = ctx.body?.redirect_uris;
		if (Array.isArray(uris) && !uris.every((uri) => isAllowedRedirectUri(String(uri)))) {
			throw new APIError('BAD_REQUEST', {
				error: 'invalid_redirect_uri',
				error_description:
					'Redirect URIs must use https, a loopback address, or an app-specific scheme.'
			});
		}
	}
}

type Row = Record<string, any>;

/** Arrays come back as arrays from Postgres and as JSON text from SQLite. */
function list(value: unknown): string[] {
	if (Array.isArray(value)) return value.map(String);
	if (typeof value === 'string' && value.startsWith('[')) {
		try {
			return (JSON.parse(value) as unknown[]).map(String);
		} catch {
			return [];
		}
	}
	return typeof value === 'string' && value ? value.split(' ') : [];
}

/** The `OAuthServer` port core talks to, over the plugin and its tables. */
export function createOAuthServer(
	auth: AphexAuthInstance,
	database: DatabaseAdapter,
	/** better-auth's base path, where the plugin's endpoints are mounted. */
	basePath = '/api/auth'
): OAuthServer {
	const authorizePath = `${basePath}/oauth2/authorize`;
	const deps = {
		database,
		verification: async () => (await auth.$context).internalAdapter
	};
	// Loosely typed on purpose: the plugin's tables aren't in better-auth's model types.
	const adapter = async (): Promise<any> => (await auth.$context).adapter;

	async function session(request: Request): Promise<{ user: Row; session: Row }> {
		const found = await auth.api.getSession({ headers: request.headers });
		if (!found?.session) throw new Error('Sign in first.');
		return found;
	}

	async function client(clientId: string): Promise<Row | null> {
		return (await adapter()).findOne({
			model: 'oauthClient',
			where: [{ field: 'clientId', value: clientId }]
		});
	}

	/**
	 * Post one step of the flow to the plugin as an HTTP request, carrying the
	 * browser's session. Not `auth.api`: the plugin's authorize step needs a real
	 * request. It answers JSON when asked, with where the browser goes next.
	 */
	async function step(
		request: Request,
		path: '/oauth2/continue' | '/oauth2/consent',
		body: Record<string, unknown>
	): Promise<{ url: string }> {
		const headers = new Headers({
			accept: 'application/json',
			'content-type': 'application/json'
		});
		for (const name of ['cookie', 'origin', 'user-agent']) {
			const value = request.headers.get(name);
			if (value) headers.set(name, value);
		}
		const { baseURL } = await auth.$context;
		const response = await auth.handler(
			new Request(`${baseURL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
		);
		const result = (await response.json().catch(() => null)) as {
			url?: string;
			error_description?: string;
			message?: string;
		} | null;
		if (!response.ok || !result?.url) {
			throw new Error(
				result?.error_description || result?.message || 'The authorization could not continue.'
			);
		}
		return { url: String(result.url) };
	}

	return {
		serverEndpoints: ['token', 'register', 'revoke', 'introspect'].map(
			(endpoint) => `${basePath}/oauth2/${endpoint}`
		),

		async metadata() {
			return { ...(await auth.api.getOAuthServerConfig({})) };
		},

		async validateToken(request, db) {
			const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
			if (!bearer?.startsWith(OAUTH_ACCESS_TOKEN_PREFIX)) return null;
			const token: Row | null = await (
				await adapter()
			).findOne({
				model: 'oauthAccessToken',
				where: [
					{
						field: 'token',
						value: await hashOAuthToken(bearer.slice(OAUTH_ACCESS_TOKEN_PREFIX.length))
					}
				]
			});
			if (!token || new Date(token.expiresAt) < new Date()) return null;
			const app = await client(token.clientId);
			if (!app || app.disabled) return null;
			const organizationId: string | undefined = token.referenceId ?? undefined;
			if (!organizationId) return null;

			const grantable = await ownerGrantableCapabilities(db, token.userId, organizationId);
			if (!grantable) return null;
			const scopes = list(token.scopes);
			const consent: Row | null = await (
				await adapter()
			).findOne({
				model: 'oauthConsent',
				where: [
					{ field: 'clientId', value: token.clientId },
					{ field: 'userId', value: token.userId },
					{ field: 'referenceId', value: organizationId }
				]
			});
			// No consent means the grant was withdrawn: a stray token reaches nothing.
			if (!consent) return null;
			const { allowed } = splitConsentScopes(list(consent.scopes));
			return {
				type: 'api_key',
				keyId: `oauth:${token.clientId}`,
				name: app.name || 'Connected app',
				permissions: scopes.includes('aphex:write') ? ['read', 'write'] : ['read'],
				capabilities: oauthScopeCapabilities(scopes, grantable, allowed),
				organizationId
			};
		},

		resumeUrl(oauthQuery) {
			// The signature and its bookkeeping belong to one hop; authorize signs afresh.
			const query = new URLSearchParams(oauthQuery);
			for (const name of ['sig', 'exp', 'ba_iat', 'ba_pl', 'ba_param']) query.delete(name);
			return `${authorizePath}?${query}`;
		},

		async authorization(request, oauthQuery) {
			const { user, session: current } = await session(request);
			const query = new URLSearchParams(oauthQuery);
			const clientId = query.get('client_id');
			const app = clientId ? await client(clientId) : null;
			if (!app) return null;
			const requested = query.get('scope')?.split(' ').filter(Boolean);
			return {
				client: {
					id: app.clientId,
					name: app.name || 'An app',
					uri: app.uri ?? null,
					icon: app.icon ?? null
				},
				redirectUri: query.get('redirect_uri') ?? '',
				scopes: requested?.length ? requested : list(app.scopes),
				organizationId: await chosenOrganization(deps, user.id, current.id, oauthQuery)
			};
		},

		async chooseOrganization(request, oauthQuery, organizationId) {
			const { user, session: current } = await session(request);
			if (!(await database.findUserMembership(user.id, organizationId))) {
				throw new Error("You're not a member of that site.");
			}
			const internal = (await auth.$context).internalAdapter;
			const identifier = siteChoiceIdentifier(current.id, oauthQuery);
			// Changing one's mind from the consent page replaces the earlier choice.
			await internal.deleteVerificationByIdentifier(identifier);
			await internal.createVerificationValue({
				identifier,
				value: organizationId,
				expiresAt: new Date(Date.now() + AUTHORIZATION_TTL_SECONDS * 1000)
			});
			return step(request, '/oauth2/continue', { postLogin: true, oauth_query: oauthQuery });
		},

		async consent(request, oauthQuery, accept) {
			return step(request, '/oauth2/consent', { accept, oauth_query: oauthQuery });
		},

		async listConnections(userId, organizationId) {
			const db = await adapter();
			const consents: Row[] = await db.findMany({
				model: 'oauthConsent',
				where: [
					{ field: 'userId', value: userId },
					{ field: 'referenceId', value: organizationId }
				]
			});
			const connections: OAuthConnection[] = [];
			for (const consent of consents) {
				const app = await client(consent.clientId);
				const { scopes, allowed } = splitConsentScopes(list(consent.scopes));
				connections.push({
					clientId: consent.clientId,
					name: app?.name || 'An app',
					uri: app?.uri ?? null,
					icon: app?.icon ?? null,
					scopes,
					allowed,
					connectedAt: new Date(consent.createdAt)
				});
			}
			return connections.sort((a, b) => b.connectedAt.getTime() - a.connectedAt.getTime());
		},

		async setAllowed(userId, organizationId, clientId, allowed) {
			const db = await adapter();
			const where = [
				{ field: 'clientId', value: clientId },
				{ field: 'userId', value: userId },
				{ field: 'referenceId', value: organizationId }
			];
			const consent: Row | null = await db.findOne({ model: 'oauthConsent', where });
			if (!consent) return false;
			const { scopes } = splitConsentScopes(list(consent.scopes));
			const ids = [...new Set(allowed.filter(isOAuthOptInCapability))].sort();
			await db.update({
				model: 'oauthConsent',
				where: [{ field: 'id', value: consent.id }],
				update: {
					scopes: [...scopes, ...ids.map((id) => ALLOW_PREFIX + id)],
					updatedAt: new Date()
				}
			});
			return true;
		},

		async disconnect(userId, organizationId, clientId) {
			const db = await adapter();
			const where = [
				{ field: 'clientId', value: clientId },
				{ field: 'userId', value: userId },
				{ field: 'referenceId', value: organizationId }
			];
			const consent = await db.findOne({ model: 'oauthConsent', where });
			// Access tokens first: they point at refresh tokens.
			await db.deleteMany({ model: 'oauthAccessToken', where });
			await db.deleteMany({ model: 'oauthRefreshToken', where });
			await db.deleteMany({ model: 'oauthConsent', where });
			return consent != null;
		}
	};
}
