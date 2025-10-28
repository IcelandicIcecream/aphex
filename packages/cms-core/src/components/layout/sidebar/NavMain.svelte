<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
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
	import { ChevronRight, type Icon as IconType } from 'lucide-svelte';

	type NavItem = {
		title: string;
		url: string;
		icon?: typeof IconType;
		isActive?: boolean;
		items?: {
			title: string;
			url: string;
		}[];
	};

	type Props = {
		items: NavItem[];
		label?: string;
	};

	let { items, label = 'Content' }: Props = $props();

	let currentPath = $derived(page.url.pathname);
</script>

<SidebarGroup>
	<SidebarGroupLabel>{label}</SidebarGroupLabel>
	<SidebarMenu>
		{#each items as item (item.title)}
			{#if item.items && item.items.length > 0}
				<Collapsible.Root open={item.isActive} class="group/collapsible">
					{#snippet child({ props })}
						<SidebarMenuItem {...props}>
							<Collapsible.Trigger>
								{#snippet child({ props })}
									<SidebarMenuButton {...props} tooltipContent={item.title}>
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
						onclick={() => goto(item.url)}
						isActive={currentPath.startsWith(item.url)}
						tooltipContent={item.title}
					>
						{#if item.icon}
							{@const Icon = item.icon}
							<Icon class="h-4 w-4" />
						{/if}
						<span>{item.title}</span>
					</SidebarMenuButton>
				</SidebarMenuItem>
			{/if}
		{/each}
	</SidebarMenu>
</SidebarGroup>
