<script lang="ts">
	/**
	 * SettingsShell — the chrome shared by every settings panel: the section
	 * tab bar, the page title/description, and a header-action slot panels can
	 * fill. Rendered by `AphexStudio` for `view === 'settings'`, so the embedded
	 * admin owns settings navigation instead of each host carrying a
	 * `settings/+layout.svelte`.
	 *
	 * Capabilities come from the admin shell's permissions context (the admin
	 * layout calls `setPermissionsContext`); the active organization's name is
	 * read from the layout's page data for the description line.
	 */
	import { page } from '$app/state';
	import { setContext } from 'svelte';
	import type { Snippet } from 'svelte';
	import type { Capability } from '../../types/capabilities';
	import { usePermissions } from '../../permissions-context.svelte';
	import {
		settingsHeaderActionContextKey,
		type SettingsHeaderActionContext
	} from '../../admin/settings-header-actions';

	let { children }: { children: Snippet } = $props();

	let headerActions = $state<Snippet | null>(null);
	setContext<SettingsHeaderActionContext>(settingsHeaderActionContextKey, {
		setActions(actions) {
			headerActions = actions;
		}
	});

	const basePath = '/admin/settings';

	const perms = usePermissions();
	function has(cap: Capability): boolean {
		return perms?.can(cap) ?? false;
	}

	// `requires: null` means any session (e.g. Profile, Members); a capability
	// hides the tab from users who lack it. Mutation controls on each panel are
	// capability-gated server-side regardless.
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

	// Active organization name for the description. Layout data isn't in core's
	// type world yet (folds away once app-augment types App.PageData), so this is
	// one localized, named read.
	interface SettingsLayoutData {
		activeOrganization?: { name?: string } | null;
	}
	const organizationName = $derived(
		(page.data as SettingsLayoutData).activeOrganization?.name ?? 'Organization'
	);

	const currentTitle = $derived.by(() => {
		const tab = [...orgTabs, ...accountTabs].find((item) => isActive(item.href));
		if (tab?.label === 'General') return 'Organization settings';
		if (tab?.label === 'Profile') return 'Profile settings';
		return tab ? `${tab.label} settings` : 'Settings';
	});

	const currentDescription = $derived.by(() => {
		const p = page.url.pathname;
		if (p === basePath) return `Profile, defaults and preferences for ${organizationName}.`;
		if (p.startsWith(`${basePath}/account`)) return 'Personal identity and account preferences.';
		if (p.startsWith(`${basePath}/members`)) return 'Manage members and invitations.';
		if (p.startsWith(`${basePath}/roles`)) return 'Manage role capabilities and access.';
		if (p.startsWith(`${basePath}/api-keys`)) return 'Create and manage programmatic access.';
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
