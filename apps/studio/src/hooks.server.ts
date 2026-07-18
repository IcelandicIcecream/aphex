import { sequence } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { waitUntil } from '@vercel/functions';
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
	if (!building && seedEnabled()) {
		// Seeding downloads a dozen-odd images and uploads each one — comfortably past
		// a serverless function's execution limit. `waitUntil` from `@vercel/functions`
		// lets it keep running in the background after the response is sent instead of
		// holding this request open — the page renders empty until it's done, and a
		// refresh shortly after shows the demo content.
		//
		// Note this is NOT `event.platform.context.waitUntil` — that shape only exists
		// for Vercel *Edge* Functions (and is deprecated even there); this app runs as a
		// standard Node.js serverless function, where `event.platform.context` is never
		// populated at all. `@vercel/functions`'s `waitUntil` is the one that actually
		// works here — it reads Vercel's request context itself, however the function is
		// invoked, and no-ops harmlessly outside Vercel. Self-hosted (Docker/Node) has no
		// per-request timeout, so it still gets the simpler, deterministic blocking path.
		if (env.VERCEL) {
			waitUntil(seedOnFirstRun(event.locals));
		} else {
			await seedOnFirstRun(event.locals);
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

export const handle = sequence(authHook, aphexHook, seedHook, routingHook);
