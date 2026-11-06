import { error, redirect } from '@sveltejs/kit';
import { isViewer } from '../../types/auth';
import { hasCapability } from '../../types/capabilities';
import type { Auth } from '../../types/auth';
import type { CMSUser } from '../../types/user';
import type {
	AdminPageData,
	AdminViewData,
	AdminStudioData,
	AdminLoginData
} from '../../admin/view-data';
import { getOrganizationTeam } from '../queries/organization-team';
import { isApiDocsEnabled, API_DOCS_PATH } from '../../api/docs-ui';
import { isInstanceUnclaimed } from '../../auth/bootstrap';

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
	return async function load(event: AdminLoadEvent): Promise<AdminPageData> {
		return {
			...(await loadView(event)),
			title: event.locals.aphexCMS.config.customization?.branding?.title
		};
	};
}

interface AdminLoadEvent {
	locals: App.Locals;
	params: { path?: string };
	url: URL;
}

async function loadView(event: AdminLoadEvent): Promise<AdminViewData> {
	// `/admin` → path '' (rest param matches zero segments). Trim any trailing
	// slash so `/admin/activity/` and `/admin/activity` resolve the same view.
	const path = (event.params.path ?? '').replace(/\/+$/, '');

	const auth = event.locals.aphexAuth;

	// Login folds into the one admin catch-all (Payload-style). An
	// unauthenticated request to any `/admin/*` URL renders the login view in
	// place rather than redirecting to a host-owned route — so auth adds zero
	// host files. An authenticated user hitting `/admin/login` is sent on to the
	// studio. (The auth hook carries any `?error=` code here via a one-time
	// redirect to `/admin/login`; see `handleAuthHook`.)
	if (!auth) {
		return loadLogin(event.locals, event.url);
	}
	if (path === 'login') {
		throw redirect(302, '/admin');
	}

	switch (path) {
		case '':
			return loadStudio(event.locals, auth);
		case 'activity':
			// ActivityView fetches /api/jobs and /api/events client-side; the
			// session + capability it needs come from the admin layout's data.
			return { view: 'activity' };
		case 'settings': {
			// General (organization identity + danger zone). Requires org.settings;
			// without it, send to the profile page (always available) so the default
			// settings URL never lands on a locked view.
			if (auth.type !== 'session') {
				throw error(401, 'Session authentication required');
			}
			if (!hasCapability(auth, 'org.settings')) {
				throw redirect(302, '/admin/settings/account');
			}
			const { databaseAdapter } = event.locals.aphexCMS;
			const [organization, memberRows] = await Promise.all([
				databaseAdapter.findOrganizationById(auth.organizationId),
				databaseAdapter.findOrganizationMembers(auth.organizationId)
			]);
			return {
				view: 'settings',
				tab: 'general',
				organization,
				memberCount: memberRows.length,
				canDelete: auth.organizationRole === 'owner'
			};
		}
		case 'settings/account': {
			// Profile + preferences + security. 2FA availability is derived from the
			// host's auth features (surfaced via config.auth.features) and whether an
			// email adapter exists — no app-only auth-config import.
			if (auth.type !== 'session') {
				throw error(401, 'Session authentication required');
			}
			const { databaseAdapter, authFeatures, emailAdapter, auth: provider } = event.locals.aphexCMS;

			// Name/image come from the user row, not the cached session cookie, so a
			// just-edited profile doesn't read back stale. The row wins wholesale
			// when present (an absent image means "removed", not "unchanged").
			const profile = provider ? await provider.getUserById(auth.user.id) : null;
			const user: CMSUser = profile
				? { ...auth.user, name: profile.name, image: profile.image }
				: auth.user;

			const userProfile = await databaseAdapter.findUserProfileById(auth.user.id);
			const userPreferences = userProfile?.preferences ?? null;

			let hasChildOrganizations = false;
			if (auth.organizationId && databaseAdapter.hierarchyEnabled) {
				const childOrgs = await databaseAdapter.getChildOrganizations(auth.organizationId);
				hasChildOrganizations = childOrgs.length > 0;
			}

			// Same resolution as the sign-in challenge: email needs an adapter behind
			// it, and TOTP comes back if dropping it would leave no factor at all.
			const methods = authFeatures?.twoFactorMethods ?? ['totp', 'email'];
			const emailOtpAvailable = methods.includes('email') && emailAdapter != null;
			const totpAvailable = methods.includes('totp') || !emailOtpAvailable;

			return {
				view: 'settings',
				tab: 'account',
				user,
				userPreferences,
				hasChildOrganizations,
				totpAvailable
			};
		}
		case 'settings/members': {
			// Members is SSR'd (not onMount-fetched) via the shared team query —
			// the same code the HTTP route serves. The chrome (SettingsShell) and
			// its capabilities come from the admin layout, not this load.
			if (auth.type !== 'session') {
				throw error(401, 'Session authentication required');
			}
			const team = await getOrganizationTeam(event.locals.aphexCMS, auth, event.url.origin);
			return { view: 'settings', tab: 'members', team };
		}
		case 'settings/roles': {
			if (auth.type !== 'session') {
				throw error(401, 'Session authentication required');
			}
			const { rolesService, databaseAdapter, partResolver } = event.locals.aphexCMS;
			const [roles, memberRows] = await Promise.all([
				rolesService.listRoles(auth.organizationId),
				databaseAdapter.findOrganizationMembers(auth.organizationId)
			]);
			// Pre-compute per-role member counts so the panel needs no user/org join.
			const roleMemberCounts: Record<string, number> = {};
			for (const m of memberRows) {
				roleMemberCounts[m.role] = (roleMemberCounts[m.role] ?? 0) + 1;
			}
			return {
				view: 'settings',
				tab: 'roles',
				roles,
				capabilityCatalog: partResolver.capabilityCatalog(),
				roleMemberCounts
			};
		}
		case 'settings/api-keys': {
			// Personal + service tokens, scoped to the caller's organization. The
			// listing comes through the AuthProvider port (host owns better-auth);
			// the key secret is never returned — it exists once, at creation.
			if (auth.type !== 'session') {
				throw error(401, 'Session authentication required');
			}
			if (!hasCapability(auth, 'apiKey.manage')) {
				throw error(403, 'You do not have permission to manage API keys');
			}
			const { auth: provider, config } = event.locals.aphexCMS;
			const allKeys = provider?.listApiKeys ? await provider.listApiKeys(auth.user.id) : [];
			// Keys carry their owning org in metadata; show only this org's.
			const apiKeys = allKeys.filter((key) => key.organizationId === auth.organizationId);
			return {
				view: 'settings',
				tab: 'api-keys',
				apiKeys,
				organizationRole: auth.organizationRole ?? null,
				// Resolved here rather than assumed in the component: the reference is
				// unmounted on an instance that opts out, and a link to a 404 is worse
				// than no link. Same predicate the route itself mounts on.
				apiDocsHref: isApiDocsEnabled(config) ? API_DOCS_PATH : null
			};
		}
		case 'settings/plugins':
			// PluginSettingsPanel renders app-provided plugins (passed to
			// AphexStudio as a prop) and reads/writes its own settings via the API.
			return { view: 'settings', tab: 'plugins' };
		default:
			throw error(404, `Unknown admin route: /admin/${path}`);
	}
}

/**
 * Login view payload. Reads only `locals.aphexCMS`, so the unauthenticated path
 * stays fully core-owned — the facts the view can't derive in the browser
 * (whether the instance is unclaimed, whether verification is required, where
 * sign-up lands) are resolved here.
 */
async function loadLogin(locals: App.Locals, url: URL): Promise<AdminLoginData> {
	const { databaseAdapter, authFeatures, config } = locals.aphexCMS;
	const unclaimed = await isInstanceUnclaimed(databaseAdapter);

	// Per-tenant branding, resolved pre-auth from the request (host owns the
	// subdomain→org policy). A resolver that throws or returns nothing falls back
	// to the default — a branding lookup must never block someone from logging in.
	let branding = null;
	const resolveBranding = config.auth?.loginBranding;
	if (resolveBranding) {
		try {
			branding = (await resolveBranding({ url, host: url.host, databaseAdapter })) ?? null;
		} catch {
			branding = null;
		}
	}

	return {
		view: 'login',
		requireEmailVerification: authFeatures?.requireEmailVerification ?? false,
		unclaimed,
		// The bootstrap owner gets an organization during their first session;
		// every later account must explicitly review pending invitations.
		signUpDestination: unclaimed ? '/admin' : '/invitations',
		branding
	};
}

/**
 * Studio view (structure / vision / media) payload. Reads only `locals.aphexCMS`
 * and the session, so it is fully core-owned — no app wiring beyond the mount.
 */
async function loadStudio(locals: App.Locals, auth: Auth): Promise<AdminStudioData> {
	try {
		const { cmsEngine, databaseAdapter } = locals.aphexCMS;

		// A schema that failed validation at boot is surfaced as a banner rather
		// than a crash, so the editor can still see what's wrong.
		const schemaError = (locals.aphexCMS as { schemaError?: { message: string } }).schemaError;
		if (schemaError) {
			return {
				view: 'studio',
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
			view: 'studio',
			documentTypes,
			schemaError: null,
			graphqlSettings,
			isReadOnly,
			userPreferences
		};
	} catch (err) {
		return {
			view: 'studio',
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
