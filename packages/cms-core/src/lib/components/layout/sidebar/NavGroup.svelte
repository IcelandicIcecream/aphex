<script lang="ts">
	import * as Collapsible from '@aphexcms/ui/shadcn/collapsible';
	import {
		SidebarGroup,
		SidebarGroupLabel,
		SidebarMenu,
		SidebarMenuItem,
		SidebarMenuButton,
		SidebarMenuSub,
		SidebarMenuSubItem,
		SidebarMenuSubButton
	} from '@aphexcms/ui/shadcn/sidebar';
	import { ChevronRight, type IconProps } from '@lucide/svelte';
	import type { Component } from 'svelte';
	import type { AdminToolPart } from '../../../plugins/types';

	export type NavGroupItem = {
		title: string;
		url: string;
		icon?: Component<IconProps>;
		isActive?: boolean;
		exact?: boolean;
		/** Leaves the studio — open in a new tab and never light up as active. */
		newTab?: boolean;
		items?: {
			title: string;
			url: string;
		}[];
	};

	type Props = {
		items: NavGroupItem[];
		label?: string;
		/** `'bottom'` is the utility tier: pinned down, one size smaller. */
		placement?: 'top' | 'bottom';
		/** Plugin admin tools filed into this group. Rendered after the nav items. */
		tools?: AdminToolPart[];
		isActive?: (item: NavGroupItem) => boolean;
		isToolActive?: (id: string) => boolean;
		onSelectTool?: (id: string) => void;
	};

	let {
		items,
		label,
		placement = 'top',
		tools = [],
		isActive,
		isToolActive,
		onSelectTool
	}: Props = $props();

	const demoted = $derived(placement === 'bottom');
	// One `mt-auto` group wins the leftover space and pins itself (and everything
	// declared after it) to the bottom.
	const size = $derived(demoted ? ('sm' as const) : ('default' as const));
</script>

<SidebarGroup class={demoted ? 'mt-auto' : undefined}>
	{#if label}
		<SidebarGroupLabel>{label}</SidebarGroupLabel>
	{/if}
	<SidebarMenu>
		{#each items as item (item.title)}
			{#if item.items && item.items.length > 0}
				<Collapsible.Root open={item.isActive} class="group/collapsible">
					{#snippet child({ props })}
						<SidebarMenuItem {...props}>
							<Collapsible.Trigger>
								{#snippet child({ props })}
									<SidebarMenuButton {...props} tooltipContent={item.title} {size}>
										{#if item.icon}
											{@const Icon = item.icon}
											<Icon class="h-4 w-4" />
										{/if}
										<span>{item.title}</span>
										<ChevronRight
											class="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
										/>
									</SidebarMenuButton>
								{/snippet}
							</Collapsible.Trigger>
							<Collapsible.Content>
								<SidebarMenuSub>
									{#each item.items as subItem (subItem.title)}
										<SidebarMenuSubItem>
											<SidebarMenuSubButton>
												{#snippet child({ props })}
													<a href={subItem.url} {...props}>
														<span>{subItem.title}</span>
													</a>
												{/snippet}
											</SidebarMenuSubButton>
										</SidebarMenuSubItem>
									{/each}
								</SidebarMenuSub>
							</Collapsible.Content>
						</SidebarMenuItem>
					{/snippet}
				</Collapsible.Root>
			{:else}
				<SidebarMenuItem>
					<SidebarMenuButton
						isActive={isActive?.(item) ?? false}
						tooltipContent={item.title}
						{size}
					>
						{#snippet child({ props })}
							<!-- A real anchor, not a button: middle-click, cmd-click and "copy
							     link" all work, and an item that leaves the studio can open in
							     its own tab instead of navigating the admin away. -->
							<a
								{...props}
								href={item.url}
								target={item.newTab ? '_blank' : undefined}
								rel={item.newTab ? 'noopener noreferrer' : undefined}
							>
								{#if item.icon}
									{@const Icon = item.icon}
									<Icon class="h-4 w-4" />
								{/if}
								<span>{item.title}</span>
							</a>
						{/snippet}
					</SidebarMenuButton>
				</SidebarMenuItem>
			{/if}
		{/each}

		<!-- Plugin tools switch the `?view=plugin:<id>` area rather than navigating a
		     path, so they stay buttons — but they sit inside whichever group the
		     plugin (or the host app) filed them under. -->
		{#each tools as tool (tool.id)}
			<SidebarMenuItem>
				<SidebarMenuButton
					onclick={() => onSelectTool?.(tool.id)}
					isActive={isToolActive?.(tool.id) ?? false}
					tooltipContent={tool.title}
					class="cursor-pointer"
					{size}
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
