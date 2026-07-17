<script lang="ts">
	import {
		Sidebar,
		SidebarContent,
		SidebarFooter,
		SidebarGroup,
		SidebarGroupLabel,
		SidebarHeader,
		SidebarMenu,
		SidebarMenuItem,
		SidebarMenuButton,
		SidebarRail
	} from '@aphexcms/ui/shadcn/sidebar';
	import OrganizationSwitcher from '../OrganizationSwitcher.svelte';
	import NavMain from './NavMain.svelte';
	import NavUser from './NavUser.svelte';
	import type { SidebarData } from '../../../types/sidebar';
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

	function isNavActive(path: string, item: { url: string; exact?: boolean }): boolean {
		if (pluginToolActive && item.url === '/admin') return false;
		if (item.exact) return path === item.url;
		const matches = path === item.url || path.startsWith(item.url + '/');
		if (!matches) return false;
		// Longest-match wins when items nest (mirrors NavMain's default tiebreak).
		return !navMainItems.some(
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

	// Convert navItems to the format expected by NavMain
	const navMainItems = $derived(
		data?.navItems?.map((item) => ({
			title: item.label,
			url: item.href,
			icon: item.icon,
			isActive: false
		})) || [
			{
				title: 'Content',
				url: '/admin',
				icon: undefined,
				isActive: false,
				exact: true
			}
		]
	);
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
		<NavMain items={navMainItems} isActive={isNavActive} />

		<!-- Plugin admin tools placed in the sidebar (placement: 'sidebar'). Rendered
		     from the plugin list at this persistent layout level, so the Tools nav
		     stays visible across every admin page (settings included). -->
		{#if sidebarTools.length > 0}
			<SidebarGroup>
				<SidebarGroupLabel>Tools</SidebarGroupLabel>
				<SidebarMenu>
					{#each sidebarTools as tool (tool.id)}
						<SidebarMenuItem>
							<SidebarMenuButton
								onclick={() => onSelectTool?.(tool.id)}
								isActive={isToolActive(tool.id)}
								tooltipContent={tool.title}
								class="cursor-pointer"
							>
								{#if tool.icon}
									{@const Icon = tool.icon}
									<Icon class="h-4 w-4" />
								{/if}
								<span>{tool.title}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					{/each}
				</SidebarMenu>
			</SidebarGroup>
		{/if}
	</SidebarContent>

	<SidebarFooter>
		{#if data?.user}
			<NavUser user={data.user} {onSignOut} />
		{/if}
	</SidebarFooter>

	<SidebarRail />
</Sidebar>
