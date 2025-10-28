import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import type { DatabaseAdapter } from '../db/';
import type { CMSConfig, Auth } from '../types/index.js';
import type { AuthProvider } from './provider.js';
import { AuthError } from './auth-errors.js';

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

		// Dynamically find the GraphQL endpoint from plugins
		let graphqlEndpoint: string | undefined;
		const graphqlPlugin = config.plugins?.find((p) => p.name === '@aphexcms/graphql-plugin');
		if (graphqlPlugin && graphqlPlugin.routes) {
			graphqlEndpoint = Object.keys(graphqlPlugin.routes)[0];
		}

		// Require authentication for protected API routes
		const protectedApiRoutes = [
			'/api/documents',
			'/api/assets',
			'/api/schemas',
			'/api/organizations',
			'/api/settings'
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

		// Make auth available in API routes
		if (auth) {
			event.locals.auth = auth;
		}
	}

	return null; // Tell the main hook to continue
}
