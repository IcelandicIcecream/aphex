import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import type { DatabaseAdapter } from '../db/';
import type { CMSConfig, Auth } from '../types/index.js';
import type { AuthProvider } from './provider.js';

export async function handleAuthHook(
	event: RequestEvent,
	config: CMSConfig,
	authProvider: AuthProvider,
	db: DatabaseAdapter
): Promise<Response | null> {
	const path = event.url.pathname;

	// 1. Admin UI routes - require session authentication
	if (path.startsWith('/admin')) {
		console.log('[AUTH HOOK] HANDLING ADMIN ROUTER.');
		try {
			const session = await authProvider.requireSession(event.request, db);
			event.locals.auth = session;
		} catch {
			throw redirect(302, config.auth?.loginUrl || '/login');
		}
	}

	// 2. API routes - accept session OR API key
	if (path.startsWith('/api/')) {
		// Skip auth routes (Better Auth handles these)
		if (path.startsWith('/api/auth')) {
			return null; // Let the main hook continue
		}

		// Try session first (for admin UI making API calls)
		let auth: Auth | null = await authProvider.getSession(event.request, db);

		// If no session, try API key
		if (!auth) {
			auth = await authProvider.validateApiKey(event.request, db);
		}

		// Require authentication for protected API routes
		const protectedApiRoutes = ['/api/documents', '/api/assets', '/api/schemas'];
		const isProtectedRoute = protectedApiRoutes.some((route) => path.startsWith(route));

		if (isProtectedRoute && !auth) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Check write permission for mutations
		if (auth && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.request.method)) {
			if (auth.type === 'api_key' && !auth.permissions.includes('write')) {
				return new Response(JSON.stringify({ error: 'Forbidden: Write permission required' }), {
					status: 403,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}

		// Make auth available in API routes
		if (auth) {
			event.locals.auth = auth;
		}
	}

	return null; // Tell the main hook to continue
}
