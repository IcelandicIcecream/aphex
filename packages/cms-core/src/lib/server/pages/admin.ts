import { error, redirect } from '@sveltejs/kit';
import { isAccepted, isExpired } from '../../auth/invitation-status';
import { isViewer } from '../../types/auth';
import { hasCapability } from '../../types/capabilities';
import type { Auth, AuthFeatures, LoginBranding, SessionAuth } from '../../types/auth';
import type { Organization } from '../../types/organization';
import type { SidebarOrganization } from '../../types/sidebar';
import type { EmailAdapter } from '../../email/index';
import type { CMSUser } from '../../types/user';
import type {
	AdminPageData,
	AdminShellData,
	AdminOrganizationListItem,
	AdminOrganizationsData,
	AdminViewData,
	AdminStudioData,
	AdminLoginData,
	AdminInviteData,
	AdminInvitationsData,
	AdminTwoFactorData
} from '../../admin/view-data';
import { getOrganizationTeam } from '../queries/organization-team';
import { getPendingInvitations } from '../queries/pending-invitations';
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
 * A route the host defines under `/admin` wins over this catch-all, and gets none of
 * the admin's chrome, because the sidebar belongs to `<AphexStudio>`.
 */
export function createAdminLoad() {
	return async function load(event: AdminLoadEvent): Promise<AdminPageData> {
		const view = await loadView(event);
		const standalone = STANDALONE_VIEWS.has(view.view);
		const auth = event.locals.aphexAuth;
		const hasShell = !standalone && auth?.type === 'session';
		return {
			...view,
			title: event.locals.aphexCMS.config.customization?.branding?.title,
			standalone,
			shell: hasShell ? await loadShell(event.locals, auth) : null,
			rbac: hasShell
				? { role: auth.organizationRole ?? null, capabilities: auth.capabilities ?? [] }
				: undefined
		};
	};
}

interface AdminLoadEvent {
	locals: App.Locals;
	params: { path?: string };
	url: URL;
	request: Request;
}

const STANDALONE_VIEWS = new Set<AdminViewData['view']>([
	'login',
	'invitations',
	'invite',
	'reset-password',
	'two-factor'
]);

/** Everything after `/admin/<prefix>/`, or null when the path is something else. */
function tokenAfter(path: string, prefix: string): string | null {
	return path.startsWith(`${prefix}/`) ? path.slice(prefix.length + 1) || null : null;
}

async function loadView(event: AdminLoadEvent): Promise<AdminViewData> {
	// `/admin` → path '' (rest param matches zero segments). Trim any trailing
	// slash so `/admin/activity/` and `/admin/activity` resolve the same view.
	const path = (event.params.path ?? '').replace(/\/+$/, '');

	const auth = event.locals.aphexAuth;

	// The account pages come first: these are the paths the auth hook lets through
	// without a full session (`isPublicAdminPath`).
	const inviteToken = tokenAfter(path, 'invite');
	if (inviteToken) return loadInvite(event.locals, event.url, inviteToken);
	if (path === 'invitations') return loadInvitations(event.locals, event.url);

	const resetToken = tokenAfter(path, 'reset-password');
	if (resetToken) {
		if (auth) throw redirect(302, '/admin');
		return {
			view: 'reset-password',
			token: resetToken,
			branding: await resolveLoginBranding(event.locals, event.url)
		};
	}
	if (path === 'two-factor') return loadTwoFactor(event);

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
			// session + capability it needs come from the shell.
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

			const { totpAvailable } = availableTwoFactorMethods(authFeatures, emailAdapter);

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
			// the same code the HTTP route serves.
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
		case 'organizations':
			if (auth.type !== 'session') {
				throw error(401, 'Session authentication required');
			}
			return {
				view: 'organizations',
				organizations: await loadUserOrganizations(event.locals, auth),
				parentOption: await loadParentOption(event.locals, auth)
			};
		case 'god-mode':
			requireSuperAdmin(auth);
			return { view: 'god-mode', tab: 'general' };
		case 'god-mode/organizations': {
			requireSuperAdmin(auth);
			const { databaseAdapter } = event.locals.aphexCMS;
			const [organizations, instanceSettings] = await Promise.all([
				databaseAdapter.findAllOrganizations(),
				databaseAdapter.getInstanceSettings()
			]);
			return {
				view: 'god-mode',
				tab: 'organizations',
				organizations: await Promise.all(
					organizations.map((organization) =>
						describeOrganization(event.locals, organization, { role: 'owner', isActive: false })
					)
				),
				allowUserOrgCreation: instanceSettings.allowUserOrgCreation ?? false
			};
		}
		default:
			throw error(404, `Unknown admin route: /admin/${path}`);
	}
}

/** Everything the sidebar shows, from the session and the database. */
async function loadShell(locals: App.Locals, auth: SessionAuth): Promise<AdminShellData> {
	const { databaseAdapter, aiProvider } = locals.aphexCMS;
	const [memberships, canCreate, faviconUrl] = await Promise.all([
		databaseAdapter.findUserOrganizations(auth.user.id),
		canCreateOrganization(locals, auth),
		resolveFavicon(locals, auth)
	]);

	const organizations: SidebarOrganization[] = memberships.map(({ organization, member }) => ({
		id: organization.id,
		name: organization.name,
		slug: organization.slug,
		role: member.role,
		isActive: organization.id === auth.organizationId,
		metadata: organization.metadata
	}));

	return {
		auth,
		organizations,
		activeOrganization: organizations.find((organization) => organization.isActive),
		canCreateOrganization: canCreate,
		// The assistant's route 404s with no provider, so don't offer it.
		agentEnabled: Boolean(aiProvider),
		faviconUrl
	};
}

/** A branding lookup must never take the admin down, so a resolver that throws means none. */
async function resolveFavicon(locals: App.Locals, auth: SessionAuth): Promise<string | null> {
	const favicon = locals.aphexCMS.config.customization?.branding?.favicon;
	if (typeof favicon !== 'function') return favicon ?? null;
	try {
		return (await favicon({ aphex: locals.aphexCMS, auth })) ?? null;
	} catch {
		return null;
	}
}

async function loadParentOption(
	locals: App.Locals,
	auth: SessionAuth
): Promise<AdminOrganizationsData['parentOption']> {
	const { databaseAdapter } = locals.aphexCMS;
	if (!databaseAdapter.hierarchyEnabled || !hasCapability(auth, 'org.settings')) return null;
	const organization = await databaseAdapter.findOrganizationById(auth.organizationId);
	return organization ? { id: organization.id, name: organization.name } : null;
}

async function canCreateOrganization(
	locals: App.Locals,
	auth: { user: CMSUser }
): Promise<boolean> {
	if (auth.user.role === 'super_admin') return true;
	const settings = await locals.aphexCMS.databaseAdapter.getInstanceSettings();
	return settings.allowUserOrgCreation ?? false;
}

function requireSuperAdmin(auth: Auth): void {
	if (auth.type !== 'session' || auth.user.role !== 'super_admin') {
		throw redirect(302, '/admin');
	}
}

async function describeOrganization(
	locals: App.Locals,
	organization: Organization,
	membership: { role: string; isActive: boolean }
): Promise<AdminOrganizationListItem> {
	const { databaseAdapter, auth: provider } = locals.aphexCMS;
	const members = await databaseAdapter.findOrganizationMembers(organization.id);
	const owner = members.find((member) => member.role === 'owner');
	const ownerUser = owner ? await provider?.getUserById(owner.userId) : null;
	return {
		id: organization.id,
		name: organization.name,
		slug: organization.slug,
		...membership,
		memberCount: members.length,
		ownerEmail: ownerUser?.email
	};
}

async function loadUserOrganizations(
	locals: App.Locals,
	auth: SessionAuth
): Promise<AdminOrganizationListItem[]> {
	const memberships = await locals.aphexCMS.databaseAdapter.findUserOrganizations(auth.user.id);
	return Promise.all(
		memberships.map(({ organization, member }) =>
			describeOrganization(locals, organization, {
				role: member.role,
				isActive: organization.id === auth.organizationId
			})
		)
	);
}

/**
 * Login view payload. Reads only `locals.aphexCMS`, so the unauthenticated path
 * stays fully core-owned — the facts the view can't derive in the browser
 * (whether the instance is unclaimed, whether verification is required, where
 * sign-up lands) are resolved here.
 */
async function loadLogin(locals: App.Locals, url: URL): Promise<AdminLoginData> {
	const { databaseAdapter, authFeatures } = locals.aphexCMS;
	const unclaimed = await isInstanceUnclaimed(databaseAdapter);
	const branding = await resolveLoginBranding(locals, url);

	return {
		view: 'login',
		requireEmailVerification: authFeatures?.requireEmailVerification ?? false,
		unclaimed,
		// The bootstrap owner gets an organization during their first session;
		// every later account must explicitly review pending invitations.
		signUpDestination: unclaimed ? '/admin' : '/admin/invitations',
		branding
	};
}

/**
 * Per-tenant branding, resolved pre-auth from the request (host owns the
 * subdomain→org policy). A resolver that throws or returns nothing falls back to the
 * default, because a branding lookup must never block someone from getting in.
 */
async function resolveLoginBranding(locals: App.Locals, url: URL): Promise<LoginBranding | null> {
	const { databaseAdapter, config } = locals.aphexCMS;
	const resolveBranding = config.auth?.loginBranding;
	if (!resolveBranding) return null;
	try {
		return (await resolveBranding({ url, host: url.host, databaseAdapter })) ?? null;
	} catch {
		return null;
	}
}

/**
 * Email needs an adapter behind it, and TOTP comes back if dropping it would leave no
 * factor at all, because a challenge offering nothing is a locked account.
 */
function availableTwoFactorMethods(
	features: AuthFeatures | undefined,
	emailAdapter: EmailAdapter | null | undefined
): { totpAvailable: boolean; otpAvailable: boolean } {
	const methods = features?.twoFactorMethods ?? ['totp', 'email'];
	const otpAvailable = methods.includes('email') && emailAdapter != null;
	return { otpAvailable, totpAvailable: methods.includes('totp') || !otpAvailable };
}

async function loadTwoFactor(event: AdminLoadEvent): Promise<AdminTwoFactorData> {
	if (event.locals.aphexAuth) throw redirect(302, '/admin');

	const { auth: provider, authFeatures, emailAdapter } = event.locals.aphexCMS;
	if (provider?.hasPendingTwoFactor?.(event.request) === false) {
		throw redirect(302, '/admin/login?error=two_factor_expired');
	}

	return {
		view: 'two-factor',
		...availableTwoFactorMethods(authFeatures, emailAdapter),
		branding: await resolveLoginBranding(event.locals, event.url)
	};
}

async function loadInvitations(locals: App.Locals, url: URL): Promise<AdminInvitationsData> {
	const auth = locals.aphexAuth;
	if (!auth || auth.type === 'api_key') throw redirect(302, '/admin/login');

	return {
		view: 'invitations',
		pendingInvitations: await getPendingInvitations(
			locals.aphexCMS.databaseAdapter,
			auth.user.email
		),
		hasOrganization: auth.type === 'session',
		canCreateOrganization: await canCreateOrganization(locals, auth),
		userEmail: auth.user.email,
		branding: await resolveLoginBranding(locals, url)
	};
}

async function loadInvite(locals: App.Locals, url: URL, token: string): Promise<AdminInviteData> {
	const { databaseAdapter } = locals.aphexCMS;
	const auth = locals.aphexAuth;
	const branding = await resolveLoginBranding(locals, url);
	const base: Pick<AdminInviteData, 'view' | 'token' | 'branding'> = {
		view: 'invite',
		token,
		branding
	};
	const closed = { ...base, invitation: null, organization: null };

	const invitation = await databaseAdapter.findInvitationByToken(token);
	if (!invitation) return { ...closed, status: 'invalid' };
	if (isAccepted(invitation)) return { ...closed, status: 'already_accepted' };
	if (isExpired(invitation)) return { ...closed, status: 'expired' };

	const organization = await databaseAdapter.findOrganizationById(invitation.organizationId);
	const details = {
		...base,
		invitation: { email: invitation.email, role: invitation.role },
		organization: organization ? { name: organization.name, slug: organization.slug } : null
	};

	// Signed in, with or without an organization yet: this is what gets them one.
	if (auth && auth.type !== 'api_key') {
		if (auth.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
			return { ...details, status: 'email_mismatch' };
		}
		await databaseAdapter.acceptInvitation(token, auth.user.id);
		await databaseAdapter.updateUserSession(auth.user.id, invitation.organizationId);
		throw redirect(302, '/admin');
	}

	return { ...details, status: 'open' };
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
