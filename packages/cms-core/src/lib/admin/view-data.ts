import type { UserSessionPreferences, OrganizationTeam, Organization } from '../types/organization';
import type { Role, CapabilityDefinition } from '../types/capabilities';
import type { CMSUser } from '../types/user';
import type { ApiKeySummary } from '../types/api-key';
import type { LoginBranding, SessionAuth } from '../types/auth';
import type { SidebarOrganization } from '../types/sidebar';
import type { PendingInvitation } from '../api/invitations';

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
	status: 'open' | 'invalid' | 'expired' | 'already_accepted' | 'email_mismatch';
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
export type AdminViewData =
	| AdminStudioData
	| AdminActivityData
	| AdminSettingsData
	| AdminLoginData
	| AdminInvitationsData
	| AdminInviteData
	| AdminResetPasswordData
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
	| { view: 'god-mode'; tab: 'general' }
	| {
			view: 'god-mode';
			tab: 'organizations';
			organizations: AdminOrganizationListItem[];
			allowUserOrgCreation: boolean;
	  };

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
