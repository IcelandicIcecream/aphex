<script lang="ts">
	import {
		Sidebar,
		SidebarContent,
		SidebarFooter,
		SidebarHeader,
		SidebarRail
	} from '@aphexcms/ui/shadcn/sidebar';
	import OrganizationSwitcher from '../OrganizationSwitcher.svelte';
	import NavGroup, { type NavGroupItem } from './NavGroup.svelte';
	import NavUser from './NavUser.svelte';
	import type { SidebarData, SidebarNavGroup } from '../../../types/sidebar';
	import type { ComponentProps } from 'svelte';
	import { page } from '$app/state';
	import type { AdminToolPart } from '../../../plugins/types';

	// A sidebar-placed plugin tool lives on /admin with `?view=plugin:<id>`. The
	// active view only counts on /admin — on settings (and other admin pages) no
	// tool is "current", so clicking one navigates back to /admin?view=plugin:<id>.
	const activeView = $derived(
		page.url.pathname === '/admin' ? (page.url.searchParams.get('view') ?? '') : ''
	);
	// Its own nav item lights up; the parent /admin ("Studio") item shouldn't also
	// — the more-specific tool wins, like nested nav. Suppress it in that case.
	const pluginToolActive = $derived(activeView.startsWith('plugin:'));
	const isToolActive = (id: string) => activeView === `plugin:${id}`;

	function isNavActive(item: NavGroupItem): boolean {
		// An item that leaves the studio is never a studio location.
		if (item.newTab) return false;
		const path = page.url.pathname;
		if (pluginToolActive && item.url === '/admin') return false;
		if (item.exact) return path === item.url;
		const matches = path === item.url || path.startsWith(item.url + '/');
		if (!matches) return false;
		// Longest-match wins when items nest.
		return !allNavItems.some(
			(other) =>
				other !== item &&
				other.url.length > item.url.length &&
				(path === other.url || path.startsWith(other.url + '/'))
		);
	}

	type Props = ComponentProps<typeof Sidebar> & {
		data: SidebarData;
		onSignOut?: () => void | Promise<void>;
		/** Sidebar-placed plugin admin tools, already capability-filtered. */
		sidebarTools?: AdminToolPart[];
		/** Open a tool's `plugin:<id>` area (navigates to /admin if elsewhere). */
		onSelectTool?: (id: string) => void;
	};

	let { data, onSignOut, sidebarTools = [], onSelectTool, ...restProps }: Props = $props();

	// Resolve the sidebar into an ordered list of groups. `navGroups` is the full
	// expression of hierarchy; the three shorthand fields desugar into the default
	// three tiers, so an app that sets none of this still gets a sensible sidebar.
	const DEFAULT_TOOLS_GROUP = 'tools';

	const resolvedGroups = $derived.by((): SidebarNavGroup[] => {
		if (data?.navGroups?.length) return data.navGroups;

		const groups: SidebarNavGroup[] = [
			{
				id: 'content',
				label: 'Content',
				items: data?.navItems?.length ? data.navItems : [{ href: '/admin', label: 'Content' }]
			}
		];
		if (data?.systemNavItems?.length)
			groups.push({ id: 'system', label: 'System', items: data.systemNavItems });
		if (data?.secondaryNavItems?.length)
			groups.push({ id: 'secondary', placement: 'bottom', items: data.secondaryNavItems });
		return groups;
	});

	const toNavItems = (group: SidebarNavGroup): NavGroupItem[] =>
		(group.items ?? []).map((item) => ({
			title: item.label,
			url: item.href,
			icon: item.icon,
			newTab: item.newTab,
			isActive: false,
			// The bare fallback nav is a single /admin item, which would otherwise
			// prefix-match every admin page and stay lit everywhere.
			exact: !data?.navGroups?.length && !data?.navItems?.length && item.href === '/admin'
		}));

	// A tool names a group by id. One that names nothing — or a group this app
	// doesn't define — lands in the default Tools group rather than vanishing.
	const groupIds = $derived(new Set(resolvedGroups.map((g) => g.id).filter(Boolean)));
	const toolsFor = (groupId: string | undefined) =>
		sidebarTools.filter((tool) => {
			const target = tool.group && groupIds.has(tool.group) ? tool.group : DEFAULT_TOOLS_GROUP;
			return target === groupId;
		});

	// Any tool that fell through to the default bucket, when the app hasn't defined
	// a group with that id itself.
	const orphanTools = $derived(
		groupIds.has(DEFAULT_TOOLS_GROUP) ? [] : toolsFor(DEFAULT_TOOLS_GROUP)
	);

	const renderedGroups = $derived(
		resolvedGroups.map((group) => ({
			group,
			items: toNavItems(group),
			tools: toolsFor(group.id)
		}))
	);

	// Longest-match is judged across every group, not within one: 'Studio' (/admin)
	// and 'Activity' (/admin/activity) can live in different groups, and a per-group
	// tiebreak would light both up on the activity page.
	const allNavItems = $derived(renderedGroups.flatMap((g) => g.items));

	// Placement partitions the list regardless of declaration order, so a 'bottom'
	// group declared first still pins to the bottom.
	const topGroups = $derived(renderedGroups.filter((g) => g.group.placement !== 'bottom'));
	const bottomGroups = $derived(renderedGroups.filter((g) => g.group.placement === 'bottom'));
</script>

<Sidebar collapsible="icon" {...restProps}>
	<SidebarHeader>
		<!-- Organization Switcher -->
		{#if data?.organizations && data.organizations.length > 0}
			<OrganizationSwitcher
				organizations={data.organizations}
				activeOrganization={data.activeOrganization}
				canCreateOrganization={data.canCreateOrganization ?? data.user?.role === 'super_admin'}
			/>
		{/if}
	</SidebarHeader>

	<SidebarContent>
		{#each topGroups as { group, items, tools } (group.id ?? group.label)}
			<NavGroup
				{items}
				{tools}
				label={group.label}
				isActive={isNavActive}
				{isToolActive}
				{onSelectTool}
			/>
		{/each}

		<!-- Plugin admin tools placed in the sidebar (placement: 'sidebar') that no
		     app-defined group claimed. Rendered at this persistent layout level, so
		     the Tools nav stays visible across every admin page (settings included). -->
		{#if orphanTools.length > 0}
			<NavGroup
				items={[]}
				tools={orphanTools}
				label="Tools"
				isActive={isNavActive}
				{isToolActive}
				{onSelectTool}
			/>
		{/if}

		{#each bottomGroups as { group, items, tools } (group.id ?? group.label)}
			<NavGroup
				{items}
				{tools}
				label={group.label}
				placement="bottom"
				isActive={isNavActive}
				{isToolActive}
				{onSelectTool}
			/>
		{/each}
	</SidebarContent>

	<SidebarFooter>
		{#if data?.user}
			<NavUser user={data.user} {onSignOut} />
		{/if}
	</SidebarFooter>

	<SidebarRail />
</Sidebar>
