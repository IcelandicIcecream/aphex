import type { UserSessionPreferences, OrganizationTeam, Organization } from '../types/organization';
import type { Role, CapabilityDefinition } from '../types/capabilities';
import type { CMSUser } from '../types/user';
import type { ApiKeySummary } from '../types/api-key';
import type { LoginBranding, SessionAuth } from '../types/auth';
import type { SidebarOrganization } from '../types/sidebar';
import type { PendingInvitation } from '../api/invitations';
import type { OAuthAuthorization, OAuthConnection } from '../auth/provider';

/**
 * The data `createAdminLoad` produces for each admin route, discriminated by
 * `view`. `AphexStudio` switches on `view` to pick the component to mount.
 *
 * This lives in a plain (Svelte-free, import-light) module so both the server
 * load helper and the client shell can share the type without dragging server
 * code into the client type graph.
 */
export interface AdminStudioData {
	view: 'studio';
	documentTypes: Array<{ name: string; title: string; description?: string }>;
	schemaError: { message: string } | null;
	graphqlSettings: { endpoint: string; enableGraphiQL: boolean } | null;
	isReadOnly: boolean;
	userPreferences: UserSessionPreferences | null;
}

export interface AdminActivityData {
	view: 'activity';
}

/**
 * Login view payload. Login is a view in the one admin catch-all (Payload-style:
 * `/admin/login` is served by the same mount, not a separate host route), so an
 * unauthenticated request to any `/admin/*` URL renders this instead of bouncing
 * to a host-owned login page. Mode / prefilled email / one-shot error code are
 * read client-side from the URL; these are the facts only the server knows.
 */
export interface AdminLoginData {
	view: 'login';
	/** Verification on → sign-up shows a "check your email" step instead of redirecting. */
	requireEmailVerification: boolean;
	/** Social sign-in providers to offer a button for (`'google'`, …); empty when none. */
	socialProviders: string[];
	/** True only before anyone has signed up — reveals the claim-code field. */
	unclaimed: boolean;
	/** Where sign-up lands once complete (`/admin` for the bootstrap owner, else `/admin/invitations`). */
	signUpDestination: string;
	/**
	 * Per-tenant branding resolved server-side from the request (e.g. subdomain →
	 * org), or `null` for the default. Lets one deployment show each company its
	 * own login. Produced by `config.auth.loginBranding`, or from the tenant's own
	 * name, logo and colour when there's no resolver.
	 */
	branding: LoginBranding | null;
	/**
	 * The organization this URL belongs to (`locals.aphexTenant`), or `null`. For a
	 * custom login component that words or lays itself out per tenant.
	 */
	organization: { name: string; slug: string } | null;
}

/** Invitations waiting for the signed-in user, who may have no organization yet. */
export interface AdminInvitationsData {
	view: 'invitations';
	pendingInvitations: PendingInvitation[];
	/** The address isn't confirmed, so an invitation is answered from its emailed link. */
	needsInvitationLink: boolean;
	hasOrganization: boolean;
	canCreateOrganization: boolean;
	userEmail: string;
	branding: LoginBranding | null;
	/** On a tenant's URL, the organization's name when the signed-in user isn't a member of it. */
	notMemberOf: string | null;
}

/** Someone following an invite link. A signed-in invitee is accepted and redirected. */
export interface AdminInviteData {
	view: 'invite';
	token: string;
	status: 'open' | 'invalid' | 'expired' | 'already_accepted' | 'email_mismatch' | 'full';
	/** Why the organization can't be joined, with `full` (`config.memberLimits`). */
	message?: string;
	invitation: { email: string; role: string } | null;
	organization: { name: string; slug: string } | null;
	branding: LoginBranding | null;
}

/** Someone following a password reset link. */
export interface AdminResetPasswordData {
	view: 'reset-password';
	token: string;
	branding: LoginBranding | null;
}

/** Someone following "This wasn't me" in a security email. */
export interface AdminSecureAccountData {
	view: 'secure-account';
	token: string;
	branding: LoginBranding | null;
}

/** The second step of sign-in: the password was right and there is no session yet. */
export interface AdminTwoFactorData {
	view: 'two-factor';
	totpAvailable: boolean;
	otpAvailable: boolean;
	branding: LoginBranding | null;
}

/**
 * Settings views share one shell (`SettingsShell`); `tab` picks the panel and
 * carries that panel's SSR payload. Grows a member per settings tab as each
 * folds into the catch-all.
 */
export type AdminSettingsData =
	| {
			view: 'settings';
			tab: 'general';
			organization: Organization | null;
			memberCount: number;
			canDelete: boolean;
	  }
	| { view: 'settings'; tab: 'members'; team: OrganizationTeam }
	| {
			view: 'settings';
			tab: 'roles';
			roles: Role[];
			capabilityCatalog: CapabilityDefinition[];
			/** Member count per role name, pre-computed so the panel needs no user join. */
			roleMemberCounts: Record<string, number>;
	  }
	| {
			view: 'settings';
			tab: 'account';
			user: CMSUser;
			userPreferences: UserSessionPreferences | null;
			hasChildOrganizations: boolean;
			totpAvailable: boolean;
			/**
			 * How this user signs in (`'credential'` is a password, else `'google'`, …);
			 * null when the auth provider can't say.
			 */
			signInMethods: string[] | null;
			/** Apps connected to this organization over OAuth; null when OAuth is off. */
			connectedApps: OAuthConnection[] | null;
			/** What this user may switch on for a connected app (they hold it themselves). */
			connectedAppOptIns: string[];
			/** Marks this device in the list of signed-in ones. */
			currentSessionId: string;
	  }
	| {
			view: 'settings';
			tab: 'api-keys';
			apiKeys: ApiKeySummary[];
			organizationRole: string | null;
			/** Path to the rendered API reference, or `null` when that UI is unmounted. */
			apiDocsHref: string | null;
	  }
	| { view: 'settings'; tab: 'plugins' };

/** Union of every admin view's SSR payload. Grows as settings views fold in. */
/** One organization on the "which site?" step of connecting an app. */
export interface AdminOAuthSite {
	id: string;
	name: string;
	slug: string;
	/** False when its plan doesn't include MCP access (`mcp.requiredCapabilities`). */
	allowed: boolean;
}

/** Connecting an app (Claude, ChatGPT) with OAuth: choosing the site it may use. */
export interface AdminOAuthSiteData {
	view: 'oauth-site';
	/** The signed query the flow passes from page to page. */
	oauthQuery: string;
	/** Null when the link has expired or isn't valid. */
	authorization: OAuthAuthorization | null;
	sites: AdminOAuthSite[];
	/** What a site without access needs, by name ("Pro"). */
	requirement: string | null;
	userEmail: string;
	branding: LoginBranding | null;
}

/** Connecting an app with OAuth: allowing or denying it. */
export interface AdminOAuthConsentData {
	view: 'oauth-consent';
	oauthQuery: string;
	authorization: OAuthAuthorization | null;
	organization: { id: string; name: string } | null;
	/** Each requested scope, in the words the user is shown. */
	scopes: Array<{ id: string; description: string }>;
	userEmail: string;
	branding: LoginBranding | null;
}

export type AdminViewData =
	| AdminOAuthSiteData
	| AdminOAuthConsentData
	| AdminStudioData
	| AdminActivityData
	| AdminSettingsData
	| AdminLoginData
	| AdminInvitationsData
	| AdminInviteData
	| AdminResetPasswordData
	| AdminSecureAccountData
	| AdminTwoFactorData
	| AdminOrganizationsData
	| AdminGodModeData;

/** An organization in the lists under `/admin/organizations` and God Mode. */
export interface AdminOrganizationListItem {
	id: string;
	name: string;
	slug: string;
	role: string;
	isActive: boolean;
	memberCount: number;
	ownerEmail?: string;
	/** When it was made, as an ISO date-time; absent when the stored date can't be read. */
	createdAt?: string;
	/**
	 * Whether the signed-in user belongs to it, so it can be switched to. God Mode
	 * lists organizations the super admin isn't in; everywhere else this is true.
	 */
	isMember: boolean;
	/** Its public site, from `organizationSiteUrl` in the config; absent without one. */
	siteUrl?: string;
}

/** The organizations the signed-in user belongs to. */
export interface AdminOrganizationsData {
	view: 'organizations';
	organizations: AdminOrganizationListItem[];
	/** The organization a new one can go under, if the user administers it. */
	parentOption: { id: string; name: string } | null;
}

/** Administration of the whole instance, for super admins. */
export type AdminGodModeData =
	| {
			view: 'god-mode';
			tab: 'general';
			/** How many organizations the instance holds, and how many were made in the last 7 days. */
			organizations: { total: number; lastWeek: number };
	  }
	| {
			view: 'god-mode';
			tab: 'organizations';
			organizations: AdminOrganizationListItem[];
			allowUserOrgCreation: boolean;
			/**
			 * Features a super admin can switch per organization, when the config can
			 * store them (`organizationCapabilities.set`); otherwise `null`.
			 */
			features: AdminGodModeFeatures | null;
	  }
	| {
			view: 'god-mode';
			tab: 'users';
			users: AdminGodModeUser[];
			/** How many match the search; all of them without one. */
			total: number;
			search: string;
			/** From 1. */
			page: number;
			pages: number;
	  };

/** An account in God Mode's list. */
export interface AdminGodModeUser {
	id: string;
	name: string;
	email: string;
	createdAt: string;
	/** The workspaces they're in, and whether deleting the account deletes each. */
	organizations: Array<{ name: string; role: string; isOnlyMember: boolean }>;
	/** Themselves and other super admins can't be deleted here. */
	canDelete: boolean;
}

/** The switches God Mode shows per organization. */
export interface AdminGodModeFeatures {
	/** Every declared organization capability, in declaration order. */
	available: Array<{ id: string; title: string; description?: string }>;
	/** What each organization has now, by organization id. */
	granted: Record<string, string[]>;
}

/** What the sidebar needs. Every view has it unless it's a full-page one. */
export interface AdminShellData {
	auth: SessionAuth;
	organizations: SidebarOrganization[];
	activeOrganization?: SidebarOrganization;
	canCreateOrganization: boolean;
	agentEnabled: boolean;
	faviconUrl: string | null;
}

/** What `createAdminLoad` returns: the view's data, the server's branding title and the shell. */
export type AdminPageData = AdminViewData & {
	title?: string;
	/** A full-page view, so there's no sidebar. */
	standalone: boolean;
	/** `null` on a full-page view, or with no full session. */
	shell: AdminShellData | null;
	/** Also read by plugin components through `page.data.rbac`. */
	rbac?: { role: string | null; capabilities: string[]; organizationCapabilities: string[] };
};
