import type { Component } from 'svelte';
import type { SchemaType } from '../types/index';
import type { CMSPlugin } from '../plugins/types';
import type { BlockPreviewProps } from './block-previews.svelte';
import type { AdminAuthClient } from './client-auth.svelte';
import type {
	AdminInvitationsData,
	AdminInviteData,
	AdminLoginData,
	AdminResetPasswordData,
	AdminTwoFactorData
} from './view-data';
import type { SidebarData } from '../types/sidebar';

/**
 * Props every account view hands its override. A host that replaces a view gets
 * the same SSR payload, branding and auth client the core view would, so a custom
 * component is a drop-in — fully styled by the host, still served by the one
 * `/admin` catch-all (zero extra route files).
 */
export interface AccountViewProps<Data> {
	data: Data;
	/** Branding title (from `AphexClientConfig.title`). */
	title: string;
	/** The host's client auth adapter (`signIn`, `signUp`, `twoFactor`, `signOut`, …). */
	authClient?: AdminAuthClient;
}

/**
 * The views a host can replace, each with the data its component receives. This is
 * the one list: `AphexComponentOverrides` and the props types derive from it.
 */
export interface AccountViews {
	/** `/admin/login`: sign in and sign up. */
	login: AdminLoginData;
	/** `/admin/invitations`: a signed-in user with no organization here, and their invitations. */
	invitations: AdminInvitationsData;
	/** `/admin/invite/<token>`: someone following an invite link. */
	invite: AdminInviteData;
	/** `/admin/reset-password/<token>`: choosing a new password from an emailed link. */
	resetPassword: AdminResetPasswordData;
	/** `/admin/two-factor`: the second step of sign-in. */
	twoFactor: AdminTwoFactorData;
}

export type LoginViewProps = AccountViewProps<AccountViews['login']>;
export type InvitationsViewProps = AccountViewProps<AccountViews['invitations']>;
export type InviteViewProps = AccountViewProps<AccountViews['invite']>;
export type ResetPasswordViewProps = AccountViewProps<AccountViews['resetPassword']>;
export type TwoFactorViewProps = AccountViewProps<AccountViews['twoFactor']>;

/**
 * Component override map — the editability seam for core-mounted views (Payload's
 * `admin.components`). Each view is frozen-by-default (zero host files) *and* an
 * override point: provide a component and the catch-all renders yours instead,
 * still at the same `/admin/*` URL. Omit it for the core default.
 */
export type AphexComponentOverrides = {
	[View in keyof AccountViews]?: Component<AccountViewProps<AccountViews[View]>>;
};

/**
 * The client-side customization seam for the embedded admin — the SvelteKit twin
 * of the server `aphex.config.ts`.
 *
 * SvelteKit's server/client boundary means `aphex.config.ts` (DB, storage, auth
 * adapters — all node-only) can't be imported into a `.svelte` route file. So
 * everything the admin needs *in the browser* is gathered here instead, in one
 * small client-safe module a host exports as `aphex.client.ts` and hands to
 * `<AphexStudio config={...} />`. Keeping it in one object is what lets the mount
 * route files stay frozen re-exports: a host customizes this, never the routes.
 */
export interface AphexClientConfig {
	/** App-defined content schemas (shared with the server config). */
	schemas: SchemaType[];
	/** Build-time plugins — component parts can't cross a `load` boundary. */
	plugins?: CMSPlugin[];
	/** Inline editor previews for custom rich-text blocks, keyed by `_type`. */
	blockPreviews?: Record<string, Component<BlockPreviewProps>>;
	/**
	 * Host-provided client-side auth adapter for the account security panels
	 * (change password, two-factor, delete account). The browser twin of the
	 * server `AuthProvider`; auth stays host-owned.
	 */
	adminAuthClient?: AdminAuthClient;
	/**
	 * Overrides the title shown in the studio chrome. Usually leave this unset: the
	 * studio uses `customization.branding.title` from the server config.
	 */
	title?: string;
	/**
	 * Replaces the sidebar's links. Each field you set replaces that tier; the defaults
	 * are Home and View site (`/`) in `navItems`, and Activity in `systemNavItems`.
	 */
	sidebar?: Pick<SidebarData, 'navGroups' | 'navItems' | 'systemNavItems' | 'secondaryNavItems'>;
	/**
	 * Renames the studio's own words for an app's domain, e.g. `{ content: 'Billing' }`.
	 * `content` titles the document types list (its heading, the breadcrumb and the
	 * browser tab); `structure` labels the tab that opens it.
	 */
	labels?: { content?: string; structure?: string };
	/**
	 * Turns off built-in tabs an app has no use for: `{ media: false, vision: false }`.
	 * Media is the asset library (images still upload through their fields); Vision
	 * is the GraphQL console. With only the document list left, the tab bar hides.
	 */
	tabs?: { media?: boolean; vision?: boolean };
	/**
	 * Component overrides for the account views (login, invitations, invite, reset
	 * password, two-factor). The escape hatch for
	 * "we lose editability": default = frozen core view driven by branding; set an
	 * override here to fully customize it while keeping it in the `/admin` catch-all.
	 */
	components?: AphexComponentOverrides;
}
