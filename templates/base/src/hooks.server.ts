import { sequence } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building, dev } from '$app/environment';
import { createCMSHook } from '@aphexcms/cms-core/server';
import { auth } from '$lib/server/auth';

// Better Auth hook (handles /api/auth/* routes)
const authHook: Handle = async ({ event, resolve }) => {
	return svelteKitHandler({ event, resolve, auth, building });
};

// CMS hook for dependency injection and route protection
// Schema changes invalidate the module graph and set __aphexSchemasDirty,
// which resets the hook instance so the next request re-initializes.
let aphexHookInstance: Handle | null = null;

const aphexHook: Handle = async ({ event, resolve }) => {
	// Check if schemas changed (set by Vite plugin)
	if ((global as any).__aphexSchemasDirty) {
		(global as any).__aphexSchemasDirty = false;
		aphexHookInstance = null;
	}

	if (!aphexHookInstance) {
		const cmsConfig = (await import(/* @vite-ignore */ '../aphex.config.ts')).default;
		aphexHookInstance = createCMSHook(cmsConfig);
	}
	return aphexHookInstance({ event, resolve });
};

const routingHook: Handle = async ({ event, resolve }) => {
	if (event.url.pathname === '/') {
		throw redirect(302, '/admin');
	}
	return resolve(event);
};

// Combine hooks - authHook must be first, then CMS for DB access and auth protection
export const handle = sequence(authHook, aphexHook, routingHook);
