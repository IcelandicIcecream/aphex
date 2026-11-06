// The client-side half of your Aphex config — the browser twin of
// `aphex.config.ts`.
//
// SvelteKit can't import the server config (DB/storage/auth adapters are
// node-only) into a `.svelte` route, so everything the admin needs in the
// browser lives here instead. `<AphexStudio config={aphexClient} />` reads it,
// which is what lets the mount route files stay frozen re-exports — you edit
// this, never the routes.
import type { AphexClientConfig } from '@aphexcms/cms-core/client';
import { schemaTypes } from '$lib/schemaTypes/index';
import { plugins } from '$lib/plugins';
import { adminAuthClient } from '$lib/admin-auth-client';
import EmbedPreview from '$lib/components/studio/EmbedPreview.svelte';

export const aphexClient: AphexClientConfig = {
	schemas: schemaTypes,
	plugins,
	adminAuthClient,
	// Inline editor previews for custom rich-text blocks — the real embed renders
	// as you write, instead of a generic card. Presentation stays app-owned.
	blockPreviews: { embed: EmbedPreview }
};
