import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { createCMSHook } from '@aphexcms/cms-core/server';
import { auth } from '$lib/server/auth';
import { seedEnabled, seedOnFirstRun } from '$lib/server/seed';
import cmsConfig from '../aphex.config';

const authHook: Handle = async ({ event, resolve }) => {
	return svelteKitHandler({ event, resolve, auth, building });
};

const aphexHook = createCMSHook(cmsConfig);

// Populate demo content the first time the app runs against an untouched site
// (see $lib/server/seed). Decided once per process; a no-op forever after. Delete
// this hook (and the seed directory) if you don't want it, or set APHEX_SEED=false.
const seedHook: Handle = async ({ event, resolve }) => {
	if (!building && seedEnabled()) await seedOnFirstRun(event.locals);
	return resolve(event);
};

export const handle = sequence(authHook, aphexHook, seedHook);
