import { sequence } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
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
	if (!building && seedEnabled()) {
		// Seeding downloads a dozen-odd images and uploads each one — comfortably past
		// a serverless function's execution limit. `platform.context.waitUntil` (set by
		// @sveltejs/adapter-vercel; see src/app.d.ts) lets it keep running in the
		// background after the response is sent instead of holding this request open —
		// the page renders empty until it's done, and a refresh shortly after shows the
		// demo content. Self-hosted (Docker/Node) has no such primitive and no per-request
		// timeout either, so blocking there is harmless.
		const waitUntil = event.platform?.context?.waitUntil;
		if (waitUntil) {
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
