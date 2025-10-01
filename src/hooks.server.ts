import { redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { createCMSHook } from '@aphex/cms-core/server';
import cmsConfig from '../aphex.config';
import { auth } from '$lib/server/auth';

// Better Auth hook (handles /api/auth/* routes)
const authHook: Handle = async ({ event, resolve }) => {
	return svelteKitHandler({ event, resolve, auth, building });
};

// CMS hook for dependency injection and route protection
const aphexHook = createCMSHook(cmsConfig);

const routingHook: Handle = async ({ event, resolve }) => {
	if (event.url.pathname === '/') {
		throw redirect(302, '/admin');
	}
	return resolve(event);
};

// Combine hooks - authHook must be first to handle /api/auth routes
export const handle = sequence(authHook, aphexHook, routingHook);
