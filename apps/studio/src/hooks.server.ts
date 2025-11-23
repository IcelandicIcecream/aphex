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
// Database provider is registered in aphex.config.ts
// Invitation processing now happens automatically in authService.getSession()
// In dev mode, dynamically import config to enable HMR for schema changes
let aphexHookInstance: Handle | null = null;

const aphexHook: Handle = async ({ event, resolve }) => {
	if (dev) {
		// In dev, always re-import to get fresh schema changes
		const cmsConfig = (await import(/* @vite-ignore */ '../aphex.config.js?t=' + Date.now())).default;
		const hook = createCMSHook(cmsConfig);
		return hook({ event, resolve });
	} else {
		// In production, create once and reuse
		if (!aphexHookInstance) {
			const cmsConfig = (await import('../aphex.config.js')).default;
			aphexHookInstance = createCMSHook(cmsConfig);
		}
		return aphexHookInstance({ event, resolve });
	}
};

const routingHook: Handle = async ({ event, resolve }) => {
	if (event.url.pathname === '/') {
		throw redirect(302, '/admin');
	}
	return resolve(event);
};

// Combine hooks - authHook must be first, then CMS for DB access and auth protection
export const handle = sequence(authHook, aphexHook, routingHook);
