<script lang="ts">
	/**
	 * AphexStudio — the embedded admin mount.
	 *
	 * A host wires its whole `/admin/*` surface in one frozen file:
	 *
	 *   <AphexStudio {data} config={aphexClient} />
	 *
	 * paired with `export const load = createAdminLoad()` in the catch-all's
	 * `+page.server.ts`. `data.view` (set by the load) selects which view mounts.
	 * All app-owned presentation — schemas, build-time plugins, inline block
	 * previews, the client auth adapter, branding — travels in one `config` object
	 * (the host's `aphex.client.ts`), so the mount route file never needs editing.
	 *
	 * `activeTab` / `handleTabChange` are passed through from the host for now
	 * (the admin layout still owns the sidebar and the `?view=` URL sync). They
	 * move inside the shell when the layout folds in.
	 */
	import { page } from '$app/state';
	import type { AdminArea } from '../admin/types';
	import { hasCapability } from '../types/capabilities';
	import type { SessionAuth } from '../types/auth';
	import type { AdminViewData } from '../admin/view-data';
	import type { AphexClientConfig } from '../admin/client-config';
	import { setAdminAuthClient } from '../admin/client-auth.svelte';
	import AdminApp from './AdminApp.svelte';
	import ActivityView from './admin/ActivityView.svelte';
	import SettingsShell from './admin/SettingsShell.svelte';
	import MembersSettings from './admin/MembersSettings.svelte';
	import RolesSettings from './admin/RolesSettings.svelte';
	import GeneralSettings from './admin/GeneralSettings.svelte';
	import AccountSettingsView from './admin/AccountSettingsView.svelte';
	import ApiKeysSettings from './admin/ApiKeysSettings.svelte';
	import PluginSettingsPanel from './admin/PluginSettingsPanel.svelte';
	import LoginView from './admin/LoginView.svelte';

	interface Props {
		/** SSR payload from `createAdminLoad`, discriminated by `view`. */
		data: AdminViewData;
		/**
		 * The client-side customization seam — schemas, plugins, block previews,
		 * the auth adapter, branding. A host exports this as `aphex.client.ts` and
		 * passes it here; the mount route file itself stays a frozen re-export.
		 */
		config: AphexClientConfig;
		/** Active tab store, owned by the host admin layout (passed through). */
		activeTab?: { value: AdminArea };
		/** Tab-change handler, owned by the host admin layout (passed through). */
		handleTabChange?: (value: string) => void;
	}

	let { data, config, activeTab, handleTabChange = () => {} }: Props = $props();

	// The client config is a stable module singleton, so destructuring it once is
	// safe — the fields don't change across renders.
	// svelte-ignore state_referenced_locally
	const {
		schemas,
		plugins = [],
		blockPreviews = {},
		title = 'Aphex CMS',
		adminAuthClient,
		components = {}
	} = config;

	// Login is a core-mounted view in this catch-all; a host may override it.
	const LoginOverride = components.login;

	// Publish the auth client once so the account panels (rendered deep in the
	// settings tree) can reach it without prop-drilling. Set at init (setContext's
	// requirement); the client is a stable singleton, so the init-only read is
	// intentional.
	// svelte-ignore state_referenced_locally
	if (adminAuthClient) setAdminAuthClient(adminAuthClient);

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

{#if data.view === 'login'}
	{#if LoginOverride}
		<LoginOverride {data} {title} authClient={adminAuthClient} />
	{:else}
		<LoginView {data} {title} authClient={adminAuthClient} />
	{/if}
{:else if data.view === 'studio'}
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
{:else if data.view === 'settings'}
	<SettingsShell>
		{#if data.tab === 'general'}
			<GeneralSettings
				organization={data.organization}
				memberCount={data.memberCount}
				canDelete={data.canDelete}
			/>
		{:else if data.tab === 'account'}
			<AccountSettingsView
				user={data.user}
				userPreferences={data.userPreferences}
				hasChildOrganizations={data.hasChildOrganizations}
				totpAvailable={data.totpAvailable}
			/>
		{:else if data.tab === 'members'}
			<MembersSettings team={data.team} />
		{:else if data.tab === 'roles'}
			<RolesSettings
				roles={data.roles}
				capabilityCatalog={data.capabilityCatalog}
				roleMemberCounts={data.roleMemberCounts}
			/>
		{:else if data.tab === 'api-keys'}
			<ApiKeysSettings
				apiKeys={data.apiKeys}
				organizationRole={data.organizationRole}
				apiDocsHref={data.apiDocsHref}
			/>
		{:else if data.tab === 'plugins'}
			<PluginSettingsPanel {plugins} />
		{/if}
	</SettingsShell>
{/if}
