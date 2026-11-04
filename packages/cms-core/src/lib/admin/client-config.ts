import type { Component } from 'svelte';
import type { SchemaType } from '../types/index';
import type { CMSPlugin } from '../plugins/types';
import type { BlockPreviewProps } from './block-previews.svelte';
import type { AdminAuthClient } from './client-auth.svelte';

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
}
