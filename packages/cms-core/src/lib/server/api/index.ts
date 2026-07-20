import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { CMSInstances } from '../../hooks';
import type { Auth } from '../../types/auth';
import { schemasRouter } from './routes/schemas';
import { documentsRouter } from './routes/documents';
import { documentsByIdRouter } from './routes/documents-by-id';
import { documentsPublishRouter } from './routes/documents-publish';
import { documentsQueryRouter } from './routes/documents-query';
import { documentVersionsRouter } from './routes/document-versions';
import { assetsRouter } from './routes/assets';
import { assetsByIdRouter } from './routes/assets-by-id';
import { assetsBulkRouter } from './routes/assets-bulk';
import { assetsReferencesRouter } from './routes/assets-references';
import { organizationsRouter } from './routes/organizations';
import { organizationsByIdRouter } from './routes/organizations-by-id';
import { organizationsInvitationsRouter } from './routes/organizations-invitations';
import { organizationsMembersRouter } from './routes/organizations-members';
import { organizationsSwitchRouter } from './routes/organizations-switch';
import { rolesRouter } from './routes/roles';
import { pluginSettingsRouter } from './routes/plugin-settings';
import { userPreferencesRouter } from './routes/user-preferences';
import { userRouter } from './routes/user';
import { workersRunRouter } from './routes/workers-run';
import { jobsRouter } from './routes/jobs';

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
 * Build the Aphex API Hono app shell.
 *
 * Returns a Hono app with `/api` basePath and the bridge middleware that
 * lifts `app.fetch(req, env)` values onto `c.var`. Built-in routes are NOT
 * mounted yet — call `mountAphexBuiltins(app)` after registering any user
 * middleware/overrides (Hono is registration-order-strict).
 */
export function createAphexApi() {
	const app = new Hono<AphexEnv>().basePath('/api');

	// Reject oversized request bodies before they're fully buffered.
	app.use(
		'*',
		bodyLimit({
			maxSize: 10 * 1024 * 1024, // 10MB for JSON endpoints
			onError: (c) => c.json({ success: false, error: 'Request body too large (max 10MB)' }, 413)
		})
	);

	// Bridge: lift values passed via app.fetch(req, env) onto c.var so
	// handlers can read c.var.aphexCMS / c.var.auth directly.
	app.use('*', async (c, next) => {
		c.set('aphexCMS', c.env.aphexCMS);
		c.set('auth', c.env.auth);
		await next();
	});

	return app;
}

/**
 * Mount cms-core's built-in resource routes onto an Aphex API app.
 *
 * Called by `createCMSHook` after `config.api?.(app)` runs, so user-provided
 * middleware (e.g. an email-sending wrap on `/organizations/invitations`)
 * registers ahead of the built-in handler and gets the chance to wrap it.
 */
export function mountAphexBuiltins(app: Hono<AphexEnv>) {
	// Order matters: more-specific paths (`/documents/query`,
	// `/documents/:id/publish`, `/documents/:id/versions/...`) must be
	// registered before `/documents/:id` so Hono's first-match-wins
	// resolver doesn't capture them under the catch-all `:id` param.
	app.route('/schemas', schemasRouter);
	app.route('/documents', documentsQueryRouter);
	app.route('/documents', documentsPublishRouter);
	app.route('/documents', documentVersionsRouter);
	// documentsRouter has the literal `/by-ids` batch endpoint, which must
	// mount before documentsByIdRouter or `:id` will swallow it.
	app.route('/documents', documentsRouter);
	app.route('/documents', documentsByIdRouter);

	// Assets — same precedence rule: specific paths before parametric.
	// `/assets/bulk` and `/assets/references/counts` must register before
	// `/assets/:id` or Hono will capture them as `:id = "bulk"` etc.
	app.route('/assets', assetsBulkRouter);
	app.route('/assets', assetsReferencesRouter);
	app.route('/assets', assetsByIdRouter);
	app.route('/assets', assetsRouter);

	// Organizations — specifics (/switch, /invitations, /members) before /:id.
	app.route('/organizations', organizationsSwitchRouter);
	app.route('/organizations', organizationsInvitationsRouter);
	app.route('/organizations', organizationsMembersRouter);
	app.route('/organizations', organizationsByIdRouter);
	app.route('/organizations', organizationsRouter);

	// Roles — combined router covers /, /:name, no precedence concern.
	app.route('/roles', rolesRouter);

	// Plugin settings — the config plane. `/`, `/:pluginId`, no precedence concern.
	app.route('/plugin-settings', pluginSettingsRouter);

	// User account routes — register specifics first.
	// `/user/cms-preference`, `/user/request-password-reset`,
	// `/user/reset-password` need to win over `/user` PATCH otherwise
	// Hono would try to match them under the wrong handler chain.
	app.route('/user', userPreferencesRouter);
	app.route('/user', userRouter);

	// Internal worker endpoint — machine-to-machine, secret-gated (404 unless
	// jobs.workerSecret is set). Under /internal so it reads as clearly non-public.
	// → POST /api/internal/workers/run
	app.route('/internal/workers', workersRunRouter);

	// Read-only job/event history (observability). → GET /api/jobs, GET /api/events
	app.route('/', jobsRouter);

	// Health check — unauthenticated, used by load balancers and uptime monitors.
	app.get('/aphex-health', async (c) => {
		try {
			const { databaseAdapter } = c.var.aphexCMS;
			const dbHealthy = await databaseAdapter.isHealthy();
			const status = dbHealthy ? 'healthy' : 'degraded';
			return c.json({ status, database: dbHealthy }, dbHealthy ? 200 : 503);
		} catch {
			return c.json({ status: 'unhealthy', database: false }, 503);
		}
	});
}

export type ApiRoutes = ReturnType<typeof createAphexApi>;

/**
 * Adapter: wrap a SvelteKit-style `RequestHandler` so it can be mounted
 * onto a Hono router.
 *
 * Used for handlers that already exist in SK form (e.g. the built-in
 * GraphQL Yoga app) and don't need to be rewritten just to flow through
 * the Hono catch-all. We synthesize the minimum `event` shape those
 * handlers actually read: `request` + `locals.{aphexCMS,auth}` + `params`
 * + `url`. If a future SK handler reaches for `cookies`, `setHeaders`, or
 * `getClientAddress`, extend the synthesized event accordingly.
 */
export function toHonoHandler(skHandler: (event: any) => Promise<Response> | Response) {
	return async (c: import('hono').Context<AphexEnv>) => {
		const fakeEvent = {
			request: c.req.raw,
			url: new URL(c.req.url),
			params: c.req.param() as Record<string, string>,
			locals: {
				aphexCMS: c.var.aphexCMS,
				auth: c.var.auth
			},
			// No-op fallbacks — only used if a wrapped SK handler probes for them.
			setHeaders: () => undefined,
			getClientAddress: () => c.req.header('x-forwarded-for') ?? '127.0.0.1'
		};
		return skHandler(fakeEvent);
	};
}
