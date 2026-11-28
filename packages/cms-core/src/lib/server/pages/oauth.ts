// The admin's pages for connecting an app (Claude, ChatGPT) to `/mcp` with OAuth.
// The auth provider runs the protocol and sends the browser here for the parts a
// person decides: signing in, which site, and whether to allow it.
import { error, redirect } from '@sveltejs/kit';
import { withOrganizationGrants } from '../../auth/auth-hooks';
import { hasRequiredCapabilities } from '../../schema-utils/required-capabilities';
import { OAUTH_SCOPES } from '../../types/capabilities';
import type { LoginBranding, SessionAuth } from '../../types/auth';
import type { AdminOAuthConsentData, AdminOAuthSiteData } from '../../admin/view-data';

interface OAuthPageEvent {
	locals: App.Locals;
	url: URL;
	request: Request;
}

function oauthServer(locals: App.Locals) {
	const oauth = locals.aphexCMS.auth?.oauth;
	if (!oauth) throw error(404, 'Connecting apps is not enabled here.');
	return oauth;
}

/** The signed query, exactly as the provider sent it. */
const oauthQueryOf = (url: URL) => url.search.replace(/^\?/, '');

/**
 * Signed out: sign in, then pick the authorization up where it left off. Works with
 * a host's own login page too, as long as it honours `callbackUrl`.
 */
export function loadOAuthLogin(event: OAuthPageEvent): never {
	const resume = oauthServer(event.locals).resumeUrl(oauthQueryOf(event.url));
	if (event.locals.aphexAuth) throw redirect(302, resume);
	const loginUrl = event.locals.aphexCMS.config.auth?.loginUrl || '/admin/login';
	throw redirect(302, `${loginUrl}?callbackUrl=${encodeURIComponent(resume)}`);
}

/** Can this organization use `/mcp` at all, given its plan and the user's role there? */
async function mcpAllowed(
	locals: App.Locals,
	organizationId: string,
	role: string
): Promise<boolean> {
	const { config, databaseAdapter, rolesService } = locals.aphexCMS;
	const required = config.mcp?.requiredCapabilities;
	if (!required?.length) return true;
	const capabilities = await withOrganizationGrants(
		await rolesService.getCapabilities(organizationId, role),
		config,
		databaseAdapter,
		organizationId
	);
	return hasRequiredCapabilities({ requiredCapabilities: required }, capabilities);
}

export async function loadOAuthSite(
	event: OAuthPageEvent,
	auth: SessionAuth,
	branding: LoginBranding | null
): Promise<AdminOAuthSiteData> {
	const { locals } = event;
	const oauthQuery = oauthQueryOf(event.url);
	const authorization = await oauthServer(locals).authorization(event.request, oauthQuery);
	const { config, databaseAdapter } = locals.aphexCMS;

	// On a tenant's own address, that tenant is the only choice.
	const tenant = locals.aphexTenantOrganization;
	const memberships = (await databaseAdapter.findUserOrganizations(auth.user.id)).filter(
		(membership) => !tenant || membership.organization.id === tenant.id
	);
	const sites = await Promise.all(
		memberships.map(async ({ organization, member }) => ({
			id: organization.id,
			name: organization.name,
			slug: organization.slug,
			allowed: await mcpAllowed(locals, organization.id, member.role)
		}))
	);

	const labels = config.organizationCapabilities?.labels;
	const required = config.mcp?.requiredCapabilities ?? [];
	return {
		view: 'oauth-site',
		oauthQuery,
		authorization,
		sites: sites.sort((a, b) => a.name.localeCompare(b.name)),
		requirement: required.length
			? required.map((id) => labels?.[id]?.title ?? id).join(', ')
			: null,
		userEmail: auth.user.email,
		branding
	};
}

export async function loadOAuthConsent(
	event: OAuthPageEvent,
	auth: SessionAuth,
	branding: LoginBranding | null
): Promise<AdminOAuthConsentData> {
	const { locals } = event;
	const oauthQuery = oauthQueryOf(event.url);
	const authorization = await oauthServer(locals).authorization(event.request, oauthQuery);
	const organization = authorization?.organizationId
		? await locals.aphexCMS.databaseAdapter.findOrganizationById(authorization.organizationId)
		: null;
	const descriptions: Record<string, string> = OAUTH_SCOPES;
	return {
		view: 'oauth-consent',
		oauthQuery,
		authorization,
		organization: organization ? { id: organization.id, name: organization.name } : null,
		scopes: (authorization?.scopes ?? [])
			.filter((id) => id in descriptions)
			.map((id) => ({ id, description: descriptions[id]! })),
		userEmail: auth.user.email,
		branding
	};
}
