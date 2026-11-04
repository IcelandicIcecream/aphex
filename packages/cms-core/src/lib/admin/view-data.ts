import type { UserSessionPreferences, OrganizationTeam, Organization } from '../types/organization';
import type { Role, CapabilityDefinition } from '../types/capabilities';
import type { CMSUser } from '../types/user';
import type { ApiKeySummary } from '../types/api-key';
import type { LoginBranding } from '../types/auth';

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
	/** Where sign-up lands once complete (`/admin` for the bootstrap owner, else `/invitations`). */
	signUpDestination: string;
	/**
	 * Per-tenant branding resolved server-side from the request (e.g. subdomain →
	 * org), or `null` for the default. Lets one deployment show each company its
	 * own login. Produced by `config.auth.loginBranding`.
	 */
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
	| AdminLoginData;
