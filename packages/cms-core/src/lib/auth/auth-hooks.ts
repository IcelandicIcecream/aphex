import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import type { DatabaseAdapter } from '../db/index';
import type { CMSConfig, Auth } from '../types/index';
import type { AuthProvider } from './provider';
import { AuthError } from './auth-errors';

export async function handleAuthHook(
	event: RequestEvent,
	config: CMSConfig,
	authProvider: AuthProvider,
	db: DatabaseAdapter
): Promise<Response | null> {
	const path = event.url.pathname;

	// 1. Admin UI routes - require session authentication
	if (path.startsWith('/admin')) {
		try {
			const session = await authProvider.requireSession(event.request, db);
			event.locals.auth = session;
		} catch (error) {
			// If it's an AuthError, redirect to login with error code
			if (error instanceof AuthError) {
				// Redirect to invitations page if user has pending invitations
				if (error.code === 'pending_invitations') {
					throw redirect(302, '/invitations');
				}
				const loginUrl = config.auth?.loginUrl || '/login';
				throw redirect(302, `${loginUrl}?error=${error.code}`);
			}
			// For other errors, redirect without error code
			throw redirect(302, config.auth?.loginUrl || '/login');
		}
	}

	// 2. Asset CDN routes - accept session OR API key OR signed token
	// Support both /assets/ and /media/ paths (media is Sanity-style URL)
	if (path.startsWith('/assets/') || path.startsWith('/media/')) {
		// Try session first (for admin UI)
		let auth: Auth | null = await authProvider.getSession(event.request, db);

		// If no session, try API key
		if (!auth) {
			auth = await authProvider.validateApiKey(event.request, db);
		}

		// Make auth available (can be null, route will check for signed token)
		if (auth) {
			event.locals.auth = auth;
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

		// Check if GraphQL plugin is configured
		let graphqlEndpoint: string | undefined;
		const hasGraphQLPlugin = config.plugins?.some((p) => {
			if (typeof p === 'string') return p === '@aphexcms/graphql-plugin';
			if (typeof p === 'object') return p.name === '@aphexcms/graphql-plugin';
			return false;
		});
		if (hasGraphQLPlugin) {
			graphqlEndpoint = '/api/graphql'; // Standard GraphQL endpoint
		}

		// Require authentication for protected API routes
		const protectedApiRoutes = [
			'/api/documents',
			'/api/assets',
			'/api/schemas',
			'/api/organizations',
			'/api/invitations',
			'/api/settings',
			'/api/instance-settings'
		];
		if (graphqlEndpoint) {
			protectedApiRoutes.push(graphqlEndpoint);
		}
		const isProtectedRoute = protectedApiRoutes.some((route) => path.startsWith(route));

		if (isProtectedRoute && !auth) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Check write permission for mutations
		if (auth && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.request.method)) {
			// Whitelist read-only POST endpoints (query operations that use POST for complex payloads)
			const readOnlyPostEndpoints = ['/api/documents/query'];
			const isReadOnlyPost = readOnlyPostEndpoints.some((route) => path === route);

			if (!isReadOnlyPost) {
				// Special handling for GraphQL
				if (graphqlEndpoint && path.startsWith(graphqlEndpoint)) {
					// We need to read the body to check if it's a mutation.
					// It's important to clone the request so we don't consume the body stream.
					const requestBody = await event.request.clone().text();
					const isMutation = requestBody.trim().startsWith('mutation');

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
			event.locals.auth = auth;
		}
	}

	// 4. All other routes - try to populate auth if session exists (optional auth)
	// This allows public pages to detect if user is logged in (like WordPress admin bar)
	if (!event.locals.auth) {
		try {
			const auth = await authProvider.getSession(event.request, db);
			if (auth) {
				event.locals.auth = auth;
			}
		} catch {
			// Silently ignore — auth is optional on non-admin/non-api routes
		}
	}

	return null; // Tell the main hook to continue
}
