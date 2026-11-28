<script lang="ts">
	import { page } from '$app/state';
	import type { Capability } from '@aphexcms/cms-core';
	import { setContext } from 'svelte';
	import type { Snippet } from 'svelte';
	import {
		settingsHeaderActionContextKey,
		type SettingsHeaderActionContext
	} from './_components/settings-header-actions';

	let { children } = $props();
	let headerActions = $state<Snippet | null>(null);

	setContext<SettingsHeaderActionContext>(settingsHeaderActionContextKey, {
		setActions(actions) {
			headerActions = actions;
		}
	});

	const basePath = '/admin/settings';

	// Resolve capabilities once — exposed by /admin/+layout.server.ts and
	// inherited through the layout data chain.
	const capabilities = $derived(page.data.rbac?.capabilities ?? []);
	function has(cap: Capability): boolean {
		return capabilities.includes(cap);
	}

	// `requires: null` means everyone with a session (e.g. Profile), `requires`
	// with a capability hides the tab from users who don't have it. Members
	// stays visible to anyone in an org since viewing who's in the org is not
	// privileged information, but mutation controls on the page itself are
	// already capability-gated server-side.
	type Tab = { label: string; href: string; requires: Capability | null };

	const orgTabs: Tab[] = $derived(
		(
			[
				{ label: 'General', href: basePath, requires: 'org.settings' as Capability },
				{ label: 'Members', href: `${basePath}/members`, requires: null },
				{
					label: 'Roles & access',
					href: `${basePath}/roles`,
					requires: 'role.manage' as Capability
				},
				{
					label: 'Plugins',
					href: `${basePath}/plugins`,
					requires: 'plugin.settings.manage' as Capability
				}
			] satisfies Tab[]
		).filter((t) => t.requires === null || has(t.requires))
	);

	const accountTabs: Tab[] = $derived(
		(
			[
				{ label: 'Profile', href: `${basePath}/account`, requires: null },
				{
					label: 'API tokens',
					href: `${basePath}/api-keys`,
					requires: 'apiKey.manage' as Capability
				}
			] satisfies Tab[]
		).filter((t) => t.requires === null || has(t.requires))
	);

	function isActive(href: string) {
		if (href === basePath) return page.url.pathname === basePath;
		return page.url.pathname.startsWith(href);
	}

	const organizationName = $derived(
		page.data.sidebarData?.activeOrganization?.name ?? 'Organization'
	);

	const currentTitle = $derived.by(() => {
		const tab = [...orgTabs, ...accountTabs].find((item) => isActive(item.href));
		if (tab?.label === 'General') return 'Organization settings';
		if (tab?.label === 'Profile') return 'Profile settings';
		return tab ? `${tab.label} settings` : 'Settings';
	});

	const currentDescription = $derived.by(() => {
		if (page.url.pathname === basePath)
			return `Profile, defaults and preferences for ${organizationName}.`;
		if (page.url.pathname.startsWith(`${basePath}/account`))
			return 'Personal identity and account preferences.';
		if (page.url.pathname.startsWith(`${basePath}/members`))
			return 'Manage members and invitations.';
		if (page.url.pathname.startsWith(`${basePath}/roles`))
			return 'Manage role capabilities and access.';
		if (page.url.pathname.startsWith(`${basePath}/api-keys`))
			return 'Create and manage programmatic access.';
		return 'Manage your organization and account.';
	});
</script>

<div class="bg-background flex flex-1 flex-col overflow-y-auto">
	<div class="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">
		<div class="min-w-0">
			<div class="mb-5 border-b">
				<div class="flex flex-col gap-4 pb-4 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<h1 class="text-2xl font-semibold tracking-tight">{currentTitle}</h1>
						<p class="text-muted-foreground mt-1 text-sm">{currentDescription}</p>
					</div>

					{#if headerActions}
						<div class="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
							{@render headerActions()}
						</div>
					{/if}
				</div>

				<nav class="flex gap-5 overflow-x-auto text-sm" aria-label="Settings sections">
					{#each [...orgTabs, ...accountTabs] as tab}
						<a
							href={tab.href}
							class="border-b-2 px-0 pb-2.5 font-medium whitespace-nowrap transition-colors {isActive(
								tab.href
							)
								? 'border-foreground text-foreground'
								: 'text-muted-foreground hover:text-foreground border-transparent'}"
						>
							{tab.label}
						</a>
					{/each}
				</nav>
			</div>

			{@render children()}
		</div>
	</div>
</div>
