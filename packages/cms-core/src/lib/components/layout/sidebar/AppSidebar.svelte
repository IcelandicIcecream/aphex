<script lang="ts">
	import {
		Sidebar,
		SidebarContent,
		SidebarFooter,
		SidebarHeader,
		SidebarRail
	} from '@aphexcms/ui/shadcn/sidebar';
	import OrganizationSwitcher from '../OrganizationSwitcher.svelte';
	import NavMain from './NavMain.svelte';
	import NavUser from './NavUser.svelte';
	import type { SidebarData } from '../../../types/sidebar';
	import type { ComponentProps } from 'svelte';

	type Props = ComponentProps<typeof Sidebar> & {
		data: SidebarData;
		onSignOut?: () => void | Promise<void>;
	};

	let { data, onSignOut, ...restProps }: Props = $props();

	// Convert navItems to the format expected by NavMain
	const navMainItems = $derived(
		data?.navItems?.map((item) => ({
			title: item.label,
			url: item.href,
			icon: undefined, // We'll keep icons simple for now
			isActive: false
		})) || [
			{
				title: 'Content',
				url: '/admin',
				icon: undefined,
				isActive: false
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
		<NavMain items={navMainItems} />
	</SidebarContent>

	<SidebarFooter>
		{#if data?.user}
			<NavUser user={data.user} {onSignOut} />
		{/if}
	</SidebarFooter>

	<SidebarRail />
</Sidebar>
