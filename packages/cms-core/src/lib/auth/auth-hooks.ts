import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import type { DatabaseAdapter } from '../db/index';
import type { CMSConfig, Auth, SessionAuth } from '../types/index';
import type { RolesService } from '../services/roles-service';
import type { AuthProvider } from './provider';
import { resolveCapabilities } from '../types/capabilities';
import { isAuthError } from './auth-errors';
import { authPagesBase, isPublicAdminPath } from './pages';
import { scopeToTenant, type Tenant } from './tenant';
import {
	grantedOrganizationCapabilities,
	withOrganizationCapabilities
} from './organization-capabilities';

/**
 * Populate `auth.capabilities` once per request, so downstream permission checks stay
 * synchronous: a session's from its role (RolesService), then for sessions and API keys
 * alike, the organization capabilities swapped for the ones the organization has.
 * Partial sessions have none.
 */
async function hydrateCapabilities(
	auth: Auth,
	config: CMSConfig,
	db: DatabaseAdapter,
	rolesService: RolesService
): Promise<void> {
	if (auth.type === 'partial_session') return;
	if (auth.type === 'session' && !auth.capabilities) {
		auth.capabilities = await rolesService.getCapabilities(
			auth.organizationId,
			auth.organizationRole
		);
	}
	const declared = config.organizationCapabilities;
	if (!declared) return;
	const granted = await grantedOrganizationCapabilities(declared, auth.organizationId, db);
	auth.capabilities = withOrganizationCapabilities(resolveCapabilities(auth), declared, granted);
}

function json(status: number, body: Record<string, unknown>): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

/** The paths Aphex itself answers, as opposed to the host's own pages. */
function isAphexPath(path: string): boolean {
	return (
		path === '/admin' ||
		path.startsWith('/admin/') ||
		path.startsWith('/api/') ||
		path.startsWith('/assets/') ||
		path.startsWith('/media/')
	);
}

export async function handleAuthHook(
	event: RequestEvent,
	config: CMSConfig,
	authProvider: AuthProvider,
	db: DatabaseAdapter,
	rolesService: RolesService,
	tenant: Tenant
): Promise<Response | null> {
	const path = event.url.pathname;

	const pagesBase = authPagesBase(config.auth?.loginUrl);

	// The host's hook may have named the organization this URL belongs to. Every
	// principal below is moved to it, so the admin, the API and the media all act in
	// that organization, whichever one the session last switched to.
	if (tenant.kind === 'unknown') {
		// Nothing to sign in to. The host's own pages decide for themselves, with
		// `locals.aphexTenantOrganization` left null and no one signed in.
		if (!isAphexPath(path) || path.startsWith('/api/auth')) return null;
		return path.startsWith('/api/')
			? json(404, { error: `No organization at ${tenant.slug}` })
			: new Response('Not found', { status: 404 });
	}
	const scoped = (auth: Auth | null) => scopeToTenant(auth, tenant, db);
	const hydrate = (auth: Auth) => hydrateCapabilities(auth, config, db, rolesService);

	// 1. Admin UI routes - require session authentication. The account pages core serves
	// need no full session, and pick up any session there is in step 4.
	if (path.startsWith('/admin') && !(pagesBase && isPublicAdminPath(path))) {
		let session: SessionAuth | null = null;
		let failure: unknown = null;
		try {
			session = await authProvider.requireSession(event.request, db);
		} catch (error) {
			failure = error;
		}
		if (session) {
			const auth = await scoped(session);
			// Signed in, but not a member of this URL's organization: the invitations
			// page says so, and lists any invitation to it.
			if (auth?.type !== 'session') throw redirect(302, `${pagesBase}/invitations`);
			await hydrate(auth);
			event.locals.aphexAuth = auth;
		} else {
			const error = failure;
			// Pending invitations always route to the dedicated review page.
			if (isAuthError(error) && error.code === 'pending_invitations') {
				throw redirect(302, `${pagesBase}/invitations`);
			}

			const loginUrl = config.auth?.loginUrl || '/login';

			// Payload-style embed: when login is mounted inside the admin surface
			// (`loginUrl` under `/admin`), don't bounce out of `/admin` — the admin
			// catch-all renders the login view in place. Redirect *once* to carry the
			// error code onto the login path, then let that path fall through (auth
			// unset) so the page can render login. Guarding on "already on the login
			// path" prevents the redirect loop a self-referential login would cause.
			if (loginUrl.startsWith('/admin')) {
				const onLoginPath = path === loginUrl || path.startsWith(`${loginUrl}/`);
				if (!onLoginPath) {
					const code = isAuthError(error) ? `?error=${error.code}` : '';
					throw redirect(302, `${loginUrl}${code}`);
				}
				// On the login path with no session: leave `aphexAuth` unset and
				// continue; `createAdminLoad` returns the login view.
			} else {
				// Classic model: login is a separate host route outside `/admin`.
				if (isAuthError(error)) {
					throw redirect(302, `${loginUrl}?error=${error.code}`);
				}
				throw redirect(302, loginUrl);
			}
		}
	}

	// 2. Asset CDN routes - accept session OR API key OR signed token
	// Support both /assets/ and /media/ paths (media is Sanity-style URL)
	if (path.startsWith('/assets/') || path.startsWith('/media/')) {
		// Try session first (for admin UI)
		let auth: Auth | null = await scoped(await authProvider.getSession(event.request, db));

		// If no session, try API key
		if (!auth) {
			auth = await scoped(await authProvider.validateApiKey(event.request, db));
		}

		// Make auth available (can be null, route will check for signed token)
		if (auth) {
			await hydrate(auth);
			event.locals.aphexAuth = auth;
		}
	}

	// 3. API routes - accept session OR API key
	if (path.startsWith('/api/')) {
		// Skip auth routes (Better Auth handles these)
		if (path.startsWith('/api/auth')) {
			return null; // Let the main hook continue
		}

		// If API key is explicitly provided, prioritize it over session
		// This allows public content access even when user is logged in to a different org
		const hasApiKey = event.request.headers.has('x-api-key');
		let auth: Auth | null = null;

		if (hasApiKey) {
			// API key takes precedence when explicitly provided
			auth = await authProvider.validateApiKey(event.request, db);
		} else {
			// Otherwise, try session (for admin UI making API calls)
			auth = await authProvider.getSession(event.request, db);
		}
		const unscoped = auth;
		auth = await scoped(auth);

		// Check if GraphQL is enabled (built-in, on by default)
		const graphqlEndpoint =
			config.graphql !== false
				? typeof config.graphql === 'object'
					? (config.graphql.path ?? '/api/graphql')
					: '/api/graphql'
				: undefined;

		// Require authentication for protected API routes
		const protectedApiRoutes = [
			'/api/documents',
			'/api/assets',
			'/api/schemas',
			'/api/organizations',
			'/api/invitations',
			'/api/roles',
			'/api/settings',
			'/api/instance-settings',
			// The generated spec enumerates this deployment's whole content model.
			// No content, but not for anonymous callers either.
			'/api/openapi.json'
		];
		if (graphqlEndpoint) {
			protectedApiRoutes.push(graphqlEndpoint);
		}
		const isProtectedRoute = protectedApiRoutes.some((route) => path.startsWith(route));

		// A key for another organization than this URL's. A signed-in non-member instead
		// carries on as a partial session, which every organization route refuses but
		// which can still accept an invitation to this organization.
		if (tenant.kind === 'found' && unscoped?.type === 'api_key' && !auth) {
			return json(403, { error: `This API key isn't for ${tenant.organization.name}` });
		}

		if (isProtectedRoute && !auth) {
			return json(401, { error: 'Unauthorized' });
		}

		// Check write permission for mutations
		if (auth && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.request.method)) {
			// Whitelist read-only POST endpoints (query operations that use POST for complex payloads)
			const readOnlyPostEndpoints = ['/api/documents/query'];
			const isReadOnlyPost = readOnlyPostEndpoints.some((route) => path === route);

			if (!isReadOnlyPost) {
				// Special handling for GraphQL
				if (graphqlEndpoint && path.startsWith(graphqlEndpoint)) {
					const requestBody = await event.request.clone().text();
					let isMutation = false;
					try {
						const parsed = JSON.parse(requestBody);
						const query = (parsed.query || '').trim();
						isMutation = query.startsWith('mutation');
					} catch {
						isMutation = requestBody.trim().startsWith('mutation');
					}

					if (isMutation && auth.type === 'api_key' && !auth.permissions.includes('write')) {
						return new Response(
							JSON.stringify({ error: 'Forbidden: Write permission required for mutations' }),
							{
								status: 403,
								headers: { 'Content-Type': 'application/json' }
							}
						);
					}
				} else {
					// Existing logic for other API routes
					if (auth.type === 'api_key' && !auth.permissions.includes('write')) {
						return new Response(JSON.stringify({ error: 'Forbidden: Write permission required' }), {
							status: 403,
							headers: { 'Content-Type': 'application/json' }
						});
					}
				}
			}
		}

		// Make auth available in API routes
		if (auth) {
			await hydrate(auth);
			event.locals.aphexAuth = auth;
		}
	}

	// 4. All other routes - try to populate auth if session exists (optional auth)
	// This allows public pages to detect if user is logged in (like WordPress admin bar)
	if (!event.locals.aphexAuth) {
		try {
			const auth = await scoped(await authProvider.getSession(event.request, db));
			if (auth) {
				await hydrate(auth);
				event.locals.aphexAuth = auth;
			}
		} catch {
			// Silently ignore — auth is optional on non-admin/non-api routes
		}
	}

	return null; // Tell the main hook to continue
}
