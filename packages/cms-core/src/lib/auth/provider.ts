// packages/cms-core/src/auth/provider.ts
import type { SessionAuth, PartialSessionAuth, ApiKeyAuth, ApiKeySummary } from '../types/index';
import type { DatabaseAdapter } from '../db/interfaces/index';
import type { Handle } from '@sveltejs/kit';
import type { CreateApiKeyRequest } from '../api/schemas/api-keys';

export interface AuthProvider {
	/**
	 * Serve the provider's own routes, such as sign-in callbacks. Core wraps its
	 * request handling in this: call `resolve` for any request that isn't yours.
	 * Requests you answer skip the CMS's auth checks. Optional, because a provider
	 * whose routes live elsewhere (SSO through a separate service) has none to serve.
	 */
	handle?: Handle;

	// Session auth (browser, admin UI)
	getSession(
		request: Request,
		db: DatabaseAdapter
	): Promise<SessionAuth | PartialSessionAuth | null>;
	requireSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth>;

	// API key auth (programmatic access)
	validateApiKey(request: Request, db: DatabaseAdapter): Promise<ApiKeyAuth | null>;
	requireApiKey(
		request: Request,
		db: DatabaseAdapter,
		permission?: 'read' | 'write'
	): Promise<ApiKeyAuth>;
	/**
	 * The display-only listing of a user's API keys, for the account settings
	 * panel. Optional: a provider without programmatic access can omit it and the
	 * panel renders empty. Secrets are never returned — a key's value exists once,
	 * at creation.
	 */
	listApiKeys?(userId: string): Promise<ApiKeySummary[]>;
	/** Mint a key bound to an organization. The result carries its secret, this once. */
	createApiKey?(
		userId: string,
		organizationId: string,
		data: CreateApiKeyRequest
	): Promise<{ id: string; name: string | null; key: string }>;
	/** Revoke a key. Scoped to `userId`, so another account's key id can't be removed. */
	deleteApiKey?(userId: string, keyId: string): Promise<boolean>;

	// User management
	getUserById(
		userId: string
	): Promise<{ id: string; name?: string; email: string; image?: string } | null>;
	getUserByEmail(
		email: string
	): Promise<{ id: string; name?: string; email: string; image?: string } | null>;
	changeUserName(userId: string, name: string): Promise<void>;
	changeUserImage?(userId: string, image: string | null): Promise<void>;

	// Password reset
	requestPasswordReset(email: string, redirectTo?: string): Promise<void>;
	resetPassword(token: string, newPassword: string): Promise<void>;

	/**
	 * Is this request midway through a two-factor sign-in? Lets the challenge page send
	 * someone back to sign in, rather than show a form that can only fail. Without it,
	 * the page shows the form and reports the failure when they submit.
	 */
	hasPendingTwoFactor?(request: Request): boolean;

	/**
	 * OAuth 2.1 for `/mcp`, so apps such as Claude and ChatGPT can connect. Present only
	 * when it's switched on; without it `/mcp` takes API keys alone and the discovery
	 * documents aren't served.
	 */
	oauth?: OAuthServer;
}

/** One authorization in progress, as the site and consent pages show it. */
export interface OAuthAuthorization {
	/** As the app registered itself: anyone can register under any name. */
	client: { id: string; name: string; uri: string | null; icon: string | null };
	/** Where the app gets the answer. Its host is the part a person can verify. */
	redirectUri: string;
	scopes: string[];
	/** The site picked for it so far, if any (and the user is still a member). */
	organizationId: string | null;
}

/** An app the user has connected to one organization. */
export interface OAuthConnection {
	clientId: string;
	name: string;
	uri: string | null;
	icon: string | null;
	scopes: string[];
	/**
	 * What the user switched on for this app beyond its scopes (publishing, deleting),
	 * out of `OAUTH_OPT_IN_CAPABILITIES`. Empty for a new connection.
	 */
	allowed: string[];
	connectedAt: Date;
}

export interface OAuthServer {
	/**
	 * Paths a client calls from its own server with a form-encoded POST and no
	 * `Origin` (token, revocation…). Core's cross-site form check lets these through
	 * (`server/csrf.ts`).
	 */
	serverEndpoints: string[];
	/** The authorization server's metadata (RFC 8414), including its `issuer`. */
	metadata(): Promise<Record<string, unknown>>;
	/** A bearer token from a connected app, as a key-shaped principal bound to one organization. */
	validateToken(request: Request, db: DatabaseAdapter): Promise<ApiKeyAuth | null>;
	/** Where to pick the authorization up again once the user has signed in (same origin). */
	resumeUrl(oauthQuery: string): string;
	/** What `oauthQuery` (the signed query the flow passes between pages) is asking for. */
	authorization(request: Request, oauthQuery: string): Promise<OAuthAuthorization | null>;
	/** Record the site the user picked, and return where the browser goes next. */
	chooseOrganization(
		request: Request,
		oauthQuery: string,
		organizationId: string
	): Promise<{ url: string }>;
	/** Allow or deny, and return where the browser goes next (back to the app). */
	consent(request: Request, oauthQuery: string, accept: boolean): Promise<{ url: string }>;
	listConnections(userId: string, organizationId: string): Promise<OAuthConnection[]>;
	/**
	 * Replace what the user has switched on for this app (`OAUTH_OPT_IN_CAPABILITIES`
	 * ids only), from its next request. False when there's no such connection.
	 */
	setAllowed(
		userId: string,
		organizationId: string,
		clientId: string,
		allowed: string[]
	): Promise<boolean>;
	/** Remove the grant and every token it issued. False when there was nothing to remove. */
	disconnect(userId: string, organizationId: string, clientId: string): Promise<boolean>;
}
