import { Hono } from 'hono';
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
import { userPreferencesRouter } from './routes/user-preferences';

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

	// Built-in routes.
	//
	// Order matters: more-specific paths (`/documents/query`,
	// `/documents/:id/publish`, `/documents/:id/versions/...`) must be
	// registered before `/documents/:id` so Hono's first-match-wins
	// resolver doesn't capture them under the catch-all `:id` param.
	app.route('/schemas', schemasRouter);
	app.route('/documents', documentsQueryRouter);
	app.route('/documents', documentsPublishRouter);
	app.route('/documents', documentVersionsRouter);
	app.route('/documents', documentsByIdRouter);
	app.route('/documents', documentsRouter);

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

	// User preferences (no SK shim today — porting makes the endpoint live).
	app.route('/user', userPreferencesRouter);

	return app;
}

export type ApiRoutes = ReturnType<typeof createAphexApi>;
