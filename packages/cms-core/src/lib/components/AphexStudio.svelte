<script lang="ts">
	/**
	 * AphexStudio — the embedded admin mount.
	 *
	 * A host wires its whole `/admin/*` surface in one file:
	 *
	 *   <AphexStudio {data} {schemas} {plugins} {blockPreviews} ... />
	 *
	 * paired with `export const load = createAdminLoad()` in the catch-all's
	 * `+page.server.ts`. `data.view` (set by the load) selects which view mounts.
	 * App-owned presentation — schemas, build-time plugins, inline block previews,
	 * branding — stays props, because the app owns those; everything else is core.
	 *
	 * `activeTab` / `handleTabChange` are passed through from the host for now
	 * (the admin layout still owns the sidebar and the `?view=` URL sync). They
	 * move inside the shell when the layout folds in.
	 */
	import { page } from '$app/state';
	import type { Component } from 'svelte';
	import type { SchemaType } from '../types/index';
	import type { CMSPlugin } from '../plugins/types';
	import type { AdminArea } from '../admin/types';
	import type { BlockPreviewProps } from '../admin/block-previews.svelte';
	import { hasCapability } from '../types/capabilities';
	import type { SessionAuth } from '../types/auth';
	import type { AdminViewData } from '../admin/view-data';
	import AdminApp from './AdminApp.svelte';
	import ActivityView from './admin/ActivityView.svelte';

	interface Props {
		/** SSR payload from `createAdminLoad`, discriminated by `view`. */
		data: AdminViewData;
		/** App-defined content schemas. */
		schemas: SchemaType[];
		/** Build-time plugins (component parts can't cross `load`). */
		plugins?: CMSPlugin[];
		/** Inline editor previews for custom rich-text blocks, keyed by `_type`. */
		blockPreviews?: Record<string, Component<BlockPreviewProps>>;
		/** Branding title shown in the dashboard chrome. */
		title?: string;
		/** Active tab store, owned by the host admin layout (passed through). */
		activeTab?: { value: AdminArea };
		/** Tab-change handler, owned by the host admin layout (passed through). */
		handleTabChange?: (value: string) => void;
	}

	let {
		data,
		schemas,
		plugins = [],
		blockPreviews = {},
		title = 'Aphex CMS',
		activeTab,
		handleTabChange = () => {}
	}: Props = $props();

	// Capabilities + role come from the admin layout's rbac payload so the shell
	// and its descendants gate per-capability. Layout data isn't in core's type
	// world yet (it folds away once `app-augment` types App.PageData), so this is
	// a single localized, named read rather than scattered `page.data as any`.
	interface AdminLayoutData {
		auth?: SessionAuth;
		rbac?: { role: string | null; capabilities: string[] };
	}
	const layout = $derived(page.data as AdminLayoutData);
	const capabilities = $derived(layout.rbac?.capabilities ?? []);
	const rbacRole = $derived(layout.rbac?.role ?? null);
</script>

{#if data.view === 'dashboard'}
	<AdminApp
		{schemas}
		{plugins}
		{blockPreviews}
		{title}
		documentTypes={data.documentTypes}
		schemaError={data.schemaError}
		graphqlSettings={data.graphqlSettings}
		isReadOnly={data.isReadOnly}
		userPreferences={data.userPreferences}
		{capabilities}
		{rbacRole}
		{activeTab}
		{handleTabChange}
	/>
{:else if data.view === 'activity'}
	<ActivityView
		canControlJobs={layout.auth ? hasCapability(layout.auth, 'org.settings') : false}
		isSuperAdmin={layout.auth?.user.role === 'super_admin'}
	/>
{/if}
