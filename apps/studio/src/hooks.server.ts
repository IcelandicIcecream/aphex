import { sequence } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { createCMSHook } from '@aphexcms/cms-core/server';
import { cmsLogger } from '@aphexcms/cms-core';
import { auth } from '$lib/server/auth';
import { bootstrapPolicy } from '$lib/server/auth/auth.config';
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

// Run the bootstrap policy's own startup step, if it has one. Only `claimCode()`
// does (it generates and logs the code); every other recipe leaves `prepare`
// undefined, so switching policies in auth.config takes this with it rather than
// stranding a hook that logs a code nothing asks for.
let bootstrapPrepared = false;
const bootstrapHook: Handle = async ({ event, resolve }) => {
	if (!building && !bootstrapPrepared) {
		bootstrapPrepared = true;
		try {
			await bootstrapPolicy.prepare?.(event.locals.aphexCMS.databaseAdapter);
		} catch (error) {
			// Never block a request over this — a missing code just means nobody can
			// claim the instance yet, which is the safe direction to fail.
			cmsLogger.error('[Bootstrap]', 'Failed to prepare bootstrap policy:', error);
		}
	}
	return resolve(event);
};

const routingHook: Handle = async ({ event, resolve }) => {
	if (event.url.pathname === '/') {
		throw redirect(302, '/admin');
	}
	return resolve(event);
};

export const handle = sequence(authHook, aphexHook, bootstrapHook, seedHook, routingHook);
