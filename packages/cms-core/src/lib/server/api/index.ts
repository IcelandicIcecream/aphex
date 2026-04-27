import { Hono } from 'hono';
import type { CMSInstances } from '../../hooks';
import type { Auth } from '../../types/auth';
import { schemasRouter } from './routes/schemas';

/**
 * Hono environment for the Aphex API.
 *
 * Variables on `c.var`:
 * - `aphexCMS` — the singleton CMS service container (db, storage, services).
 * - `auth` — the resolved auth principal for this request, or null if anonymous.
 *
 * These are populated by the SvelteKit catch-all, which invokes
 * `app.fetch(request, { aphexCMS, auth })` and the bridge middleware below
 * lifts them onto `c.var`.
 */
export type AphexEnv = {
	Variables: {
		aphexCMS: CMSInstances;
		auth: Auth | null;
	};
	Bindings: {
		aphexCMS: CMSInstances;
		auth: Auth | null;
	};
};

/**
 * Build the Aphex API Hono app.
 *
 * Called once at hook init time after services are constructed. Routes are
 * registered onto the returned app by:
 *   1. cms-core itself (built-in resources, in subsequent migration phases)
 *   2. `config.api?.(app)` from the user's `aphex.config.ts`
 *
 * The returned app is then stored on `CMSInstances.apiApp` and reused for
 * every request via the SvelteKit catch-all.
 */
export function createAphexApi() {
	const app = new Hono<AphexEnv>().basePath('/api');

	// Bridge: lift values passed via app.fetch(req, env) onto c.var so
	// handlers can read c.var.aphexCMS / c.var.auth directly.
	app.use('*', async (c, next) => {
		c.set('aphexCMS', c.env.aphexCMS);
		c.set('auth', c.env.auth);
		await next();
	});

	// Built-in routes
	app.route('/schemas', schemasRouter);

	return app;
}

export type ApiRoutes = ReturnType<typeof createAphexApi>;
