import type { Component } from 'svelte';
import type { SchemaType } from '../types/index';
import type { CMSPlugin } from '../plugins/types';
import type { BlockPreviewProps } from './block-previews.svelte';
import type { AdminAuthClient } from './client-auth.svelte';
import type { AdminLoginData } from './view-data';

/**
 * Props every core-mounted view hands its override. A host that replaces a view
 * gets the same SSR payload, branding and auth client the core view would, so a
 * custom component is a drop-in — fully styled by the host, still served by the
 * one `/admin` catch-all (zero extra route files).
 */
export interface LoginViewProps {
	data: AdminLoginData;
	/** Branding title (from `AphexClientConfig.title`). */
	title: string;
	/** The host's client auth adapter — `signIn`/`signUp`/`sendVerificationEmail`. */
	authClient?: AdminAuthClient;
}

/**
 * Component override map — the editability seam for core-mounted views (Payload's
 * `admin.components`). Each view is frozen-by-default (zero host files) *and* an
 * override point: provide a component and the catch-all renders yours instead,
 * still at the same `/admin/*` URL. Omit it for the core default.
 */
export interface AphexComponentOverrides {
	/** Replace the `/admin/login` view with your own (keeps it in the catch-all). */
	login?: Component<LoginViewProps>;
}

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
	/** Branding title shown in the studio chrome. */
	title?: string;
	/**
	 * Component overrides for core-mounted views (login, …). The escape hatch for
	 * "we lose editability": default = frozen core view driven by branding; set an
	 * override here to fully customize it while keeping it in the `/admin` catch-all.
	 */
	components?: AphexComponentOverrides;
}
