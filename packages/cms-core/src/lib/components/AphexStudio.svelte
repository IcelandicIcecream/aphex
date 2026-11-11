<script lang="ts">
	/**
	 * AphexStudio — the embedded admin mount, sidebar included. A host wires its whole
	 * `/admin/*` surface in one frozen file:
	 *
	 *   <AphexStudio {data} config={aphexClient} />
	 *
	 * paired with `export const load = createAdminLoad()` in the catch-all's
	 * `+page.server.ts`. `data.view` selects which view mounts. Everything the host
	 * customizes travels in `config` (its `aphex.client.ts`), so this route file never
	 * needs editing.
	 */
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { Activity, ExternalLink, House } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { AdminArea } from '../admin/types';
	import { hasCapability } from '../types/capabilities';
	import type { SidebarData } from '../types/sidebar';
	import { setPermissionsContext } from '../permissions-context.svelte';
	import { setOrganizationContext } from '../organization-context.svelte';
	import type { AdminPageData } from '../admin/view-data';
	import type { AphexClientConfig } from '../admin/client-config';
	import { setAdminAuthClient } from '../admin/client-auth.svelte';
	import AdminApp from './AdminApp.svelte';
	import Sidebar from './layout/Sidebar.svelte';
	import ConfirmDialogHost from './admin/confirm-dialog/ConfirmDialogHost.svelte';
	import OrganizationsView from './admin/OrganizationsView.svelte';
	import GodModeView from './admin/GodModeView.svelte';
	import ActivityView from './admin/ActivityView.svelte';
	import SettingsShell from './admin/SettingsShell.svelte';
	import MembersSettings from './admin/MembersSettings.svelte';
	import RolesSettings from './admin/RolesSettings.svelte';
	import GeneralSettings from './admin/GeneralSettings.svelte';
	import AccountSettingsView from './admin/AccountSettingsView.svelte';
	import ApiKeysSettings from './admin/ApiKeysSettings.svelte';
	import PluginSettingsPanel from './admin/PluginSettingsPanel.svelte';
	import LoginView from './admin/LoginView.svelte';
	import InvitationsView from './admin/InvitationsView.svelte';
	import InviteView from './admin/InviteView.svelte';
	import ResetPasswordView from './admin/ResetPasswordView.svelte';
	import TwoFactorChallengeView from './admin/TwoFactorChallengeView.svelte';

	interface Props {
		/** SSR payload from `createAdminLoad`, discriminated by `view`. */
		data: AdminPageData;
		/**
		 * The client-side customization seam — schemas, plugins, block previews,
		 * the auth adapter, branding. A host exports this as `aphex.client.ts` and
		 * passes it here; the mount route file itself stays a frozen re-export.
		 */
		config: AphexClientConfig;
	}

	let { data, config }: Props = $props();

	// The client config is a stable module singleton, so destructuring it once is
	// safe — the fields don't change across renders.
	// svelte-ignore state_referenced_locally
	const {
		schemas,
		plugins = [],
		blockPreviews = {},
		adminAuthClient,
		components = {},
		sidebar = {}
	} = config;

	// `customization.branding.title` in the server config is the source of truth.
	const title = $derived(config.title ?? data.title ?? 'Aphex CMS');

	// The account views are core-mounted in this catch-all; a host may replace any of them.
	const Login = components.login ?? LoginView;
	const Invitations = components.invitations ?? InvitationsView;
	const Invite = components.invite ?? InviteView;
	const ResetPassword = components.resetPassword ?? ResetPasswordView;
	const TwoFactor = components.twoFactor ?? TwoFactorChallengeView;

	// Publish the auth client once so the account panels (rendered deep in the
	// settings tree) can reach it without prop-drilling. Set at init (setContext's
	// requirement); the client is a stable singleton, so the init-only read is
	// intentional.
	// svelte-ignore state_referenced_locally
	if (adminAuthClient) setAdminAuthClient(adminAuthClient);

	// Set here, above the sidebar and every view, because all of them gate on it.
	setPermissionsContext(
		() => data.rbac?.capabilities ?? [],
		() => data.rbac?.role ?? null,
		() => data.rbac?.organizationCapabilities ?? []
	);
	// The organization the studio is acting in, for any component inside it.
	setOrganizationContext(() => data.shell?.activeOrganization ?? null);

	const shell = $derived(data.shell);
	const capabilities = $derived(data.rbac?.capabilities ?? []);
	const rbacRole = $derived(data.rbac?.role ?? null);

	// The server-rendered admin paints well before its JS can respond, so cover it until
	// it can, rather than let taps land on dead controls.
	let hydrated = $state(false);
	onMount(() => {
		hydrated = true;
	});

	let activeArea = $state<AdminArea>('structure');
	const activeTab = {
		get value() {
			return activeArea;
		},
		set value(area: AdminArea) {
			activeArea = area;
		}
	};

	// Plugin areas are addressable too, so a refresh keeps you on the same tab.
	function isArea(value: string): value is AdminArea {
		return ['structure', 'vision', 'media'].includes(value) || value.startsWith('plugin:');
	}

	$effect(() => {
		const area = page.url.searchParams.get('view');
		activeArea = area && isArea(area) ? area : 'structure';
	});

	function selectArea(area: string) {
		if (isArea(area)) activeArea = area;
	}

	/** A tab picked in the sidebar also goes in the URL. */
	function navigateToArea(area: string) {
		selectArea(area);
		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (area === 'structure') params.delete('view');
		else params.set('view', area);
		const query = params.toString();
		goto(`/admin${query ? `?${query}` : ''}`, { replaceState: true, keepFocus: true });
	}

	// `/admin` with no session goes wherever this host signs people in.
	async function handleSignOut() {
		await adminAuthClient?.signOut();
		await goto('/admin', { invalidateAll: true });
	}

	const sidebarData = $derived.by((): SidebarData | null => {
		if (!shell) return null;
		const { user } = shell.auth;
		return {
			user: { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role },
			branding: { title },
			navItems: [
				{ href: '/admin', label: 'Home', icon: House },
				{ href: '/', label: 'View site', icon: ExternalLink, newTab: true }
			],
			systemNavItems: [{ href: '/admin/activity', label: 'Activity', icon: Activity }],
			...sidebar,
			organizations: shell.organizations,
			activeOrganization: shell.activeOrganization,
			canCreateOrganization: shell.canCreateOrganization
		};
	});

	const enableGraphiQL = $derived(
		data.view === 'studio' ? (data.graphqlSettings?.enableGraphiQL ?? false) : false
	);
</script>

<svelte:head>
	{#if shell?.faviconUrl}<link rel="icon" href={shell.faviconUrl} />{/if}
</svelte:head>

{#snippet view()}
	{#if data.view === 'login'}
		<Login {data} {title} authClient={adminAuthClient} />
	{:else if data.view === 'invitations'}
		<Invitations {data} {title} authClient={adminAuthClient} />
	{:else if data.view === 'invite'}
		<Invite {data} {title} authClient={adminAuthClient} />
	{:else if data.view === 'reset-password'}
		<ResetPassword {data} {title} authClient={adminAuthClient} />
	{:else if data.view === 'two-factor'}
		<TwoFactor {data} {title} authClient={adminAuthClient} />
	{:else if data.view === 'studio'}
		<AdminApp
			{schemas}
			{plugins}
			{blockPreviews}
			{title}
			contentLabel={config.labels?.content}
			documentTypes={data.documentTypes}
			schemaError={data.schemaError}
			graphqlSettings={data.graphqlSettings}
			isReadOnly={data.isReadOnly}
			userPreferences={data.userPreferences}
			{capabilities}
			{rbacRole}
			{activeTab}
			handleTabChange={selectArea}
		/>
	{:else if data.view === 'activity'}
		<ActivityView
			canControlJobs={shell ? hasCapability(shell.auth, 'org.settings') : false}
			isSuperAdmin={shell?.auth.user.role === 'super_admin'}
		/>
	{:else if data.view === 'organizations'}
		<OrganizationsView {data} canCreate={shell?.canCreateOrganization ?? false} />
	{:else if data.view === 'god-mode'}
		<GodModeView {data} userEmail={shell?.auth.user.email ?? ''} />
	{:else if data.view === 'settings'}
		<SettingsShell organizationName={shell?.activeOrganization?.name}>
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
{/snippet}

{#if sidebarData}
	<Sidebar
		data={sidebarData}
		onSignOut={handleSignOut}
		{enableGraphiQL}
		enableAssistant={shell?.agentEnabled ?? false}
		{activeTab}
		onTabChange={navigateToArea}
		{plugins}
		structureLabel={config.labels?.structure}
		tabs={config.tabs}
	>
		{@render view()}
	</Sidebar>
	<ConfirmDialogHost />
{:else}
	{@render view()}
{/if}

{#if shell && !hydrated}
	<div
		class="bg-background fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4"
		out:fade={{ duration: 200 }}
	>
		<div class="border-muted border-t-primary h-7 w-7 animate-spin rounded-full border-[3px]"></div>
		<p class="text-muted-foreground text-xs font-medium tracking-wide">Loading studio…</p>
	</div>
{/if}
