import { sequence } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { createCMSHook } from '@aphexcms/cms-core/server';
import { auth } from '$lib/server/auth';
import cmsConfig from '../aphex.config';

const authHook: Handle = async ({ event, resolve }) => {
	return svelteKitHandler({ event, resolve, auth, building });
};

const aphexHook = createCMSHook(cmsConfig);

const routingHook: Handle = async ({ event, resolve }) => {
	if (event.url.pathname === '/') {
		throw redirect(302, '/admin');
	}
	return resolve(event);
};

export const handle = sequence(authHook, aphexHook, routingHook);
