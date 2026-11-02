import { error, redirect } from '@sveltejs/kit';
import { isViewer } from '../../types/auth';
import type { Auth } from '../../types/auth';
import type { AdminViewData, AdminDashboardData } from '../../admin/view-data';

/**
 * The single SSR load behind the embedded `/admin/[...path]` catch-all. It
 * switches on the rest param and returns the payload for the matching view,
 * discriminated by `view` so `<AphexStudio>` knows what to mount.
 *
 * This is the "feed the routes" half of embedded Aphex: a host wires it in one
 * line (`export const load = createAdminLoad()`), and every admin view a release
 * adds is served without the host touching a file.
 *
 * Paths still served by their own route files (e.g. `settings/*`) never reach
 * here — SvelteKit resolves a specific route before a rest param — so the
 * `default` 404 only fires for genuinely unknown admin URLs. As each of those
 * views folds into this switch, its standalone route is deleted and the catch-all
 * picks it up.
 */
export function createAdminLoad() {
	return async function load(event: {
		locals: App.Locals;
		params: { path?: string };
		url: URL;
	}): Promise<AdminViewData> {
		// `/admin` → path '' (rest param matches zero segments). Trim any trailing
		// slash so `/admin/activity/` and `/admin/activity` resolve the same view.
		const path = (event.params.path ?? '').replace(/\/+$/, '');

		const auth = event.locals.aphexAuth;
		if (!auth) {
			throw redirect(307, '/login');
		}

		switch (path) {
			case '':
				return loadDashboard(event.locals, auth);
			case 'activity':
				// ActivityView fetches /api/jobs and /api/events client-side; the
				// session + capability it needs come from the admin layout's data.
				return { view: 'activity' };
			default:
				throw error(404, `Unknown admin route: /admin/${path}`);
		}
	};
}

/**
 * Dashboard (structure / vision / media) payload. Reads only `locals.aphexCMS`
 * and the session, so it is fully core-owned — no app wiring beyond the mount.
 */
async function loadDashboard(locals: App.Locals, auth: Auth): Promise<AdminDashboardData> {
	try {
		const { cmsEngine, databaseAdapter } = locals.aphexCMS;

		// A schema that failed validation at boot is surfaced as a banner rather
		// than a crash, so the editor can still see what's wrong.
		const schemaError = (locals.aphexCMS as { schemaError?: { message: string } }).schemaError;
		if (schemaError) {
			return {
				view: 'dashboard',
				documentTypes: [],
				schemaError: { message: schemaError.message },
				graphqlSettings: null,
				isReadOnly: false,
				userPreferences: null
			};
		}

		const documentTypes = await cmsEngine.listDocumentTypes();

		const userProfile = await databaseAdapter.findUserProfileById(
			auth.type === 'session' ? auth.user.id : ''
		);
		const userPreferences = userProfile?.preferences ?? null;

		// GraphQL is built in and on by default; the shape matches AdminApp's prop.
		const graphqlSettings = locals.aphexCMS?.graphqlSettings ?? null;

		// Viewers see the admin read-only. API-key sessions never render the admin.
		const isReadOnly = auth.type === 'session' ? isViewer(auth) : false;

		return {
			view: 'dashboard',
			documentTypes,
			schemaError: null,
			graphqlSettings,
			isReadOnly,
			userPreferences
		};
	} catch (err) {
		return {
			view: 'dashboard',
			documentTypes: [],
			schemaError: {
				message: err instanceof Error ? err.message : 'Unknown schema error'
			},
			graphqlSettings: null,
			isReadOnly: false,
			userPreferences: null
		};
	}
}
