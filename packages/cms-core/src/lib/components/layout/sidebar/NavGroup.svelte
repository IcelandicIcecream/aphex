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
	import { ChevronRight, Ellipsis, type IconProps } from '@lucide/svelte';
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
		/** The group's id, which a collapsible group remembers its state under. */
		id?: string;
		label?: string;
		/** One row (`label` and a chevron) that opens to show the group's links. */
		collapsible?: boolean;
		/** One of the group's links is the current page: a collapsible group opens. */
		holdsActive?: boolean;
		/** `'bottom'` is the utility tier: pinned down, one size smaller. */
		placement?: 'top' | 'bottom';
		/** Plugin admin tools filed into this group. Rendered after the nav items. */
		tools?: AdminToolPart[];
		isActive?: (item: NavGroupItem) => boolean;
		isToolActive?: (id: string) => boolean;
		onSelectTool?: (id: string) => void;
	};

	/**
	 * A stable name for a link, for a guided tour to point at: `type:<name>` for a
	 * content type's list, else `nav:<href>`. Tools are `tool:<id>`.
	 */
	function tourId(url: string): string {
		const docType = new URL(url, 'http://x').searchParams.get('docType');
		return docType ? `type:${docType}` : `nav:${url}`;
	}

	let {
		items,
		id,
		label,
		collapsible = false,
		holdsActive = false,
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

	// A collapsible group's state is a per-browser convenience: kept when it can
	// be, and closed when it can't. It opens while it holds the current page.
	const storageKey = $derived(`aphex:sidebar-group:${id ?? label ?? ''}`);
	let open = $state(false);
	$effect(() => {
		if (!collapsible) return;
		try {
			open = localStorage.getItem(storageKey) === 'open';
		} catch {
			open = false;
		}
	});
	$effect(() => {
		if (collapsible && holdsActive) open = true;
	});
	function remember(next: boolean) {
		open = next;
		try {
			localStorage.setItem(storageKey, next ? 'open' : 'closed');
		} catch {
			// Not kept: it opens closed next time.
		}
	}
</script>

{#snippet entries()}
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
				<SidebarMenuButton isActive={isActive?.(item) ?? false} tooltipContent={item.title} {size}>
					{#snippet child({ props })}
						<!-- A real anchor, not a button: middle-click, cmd-click and "copy
							     link" all work, and an item that leaves the studio can open in
							     its own tab instead of navigating the admin away. -->
						<a
							{...props}
							data-tour={tourId(item.url)}
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
				data-tour="tool:{tool.id}"
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
{/snippet}

<SidebarGroup class={demoted ? 'mt-auto' : undefined}>
	{#if collapsible && label}
		<Collapsible.Root {open} onOpenChange={remember} class="group/more">
			<!-- A heading like every other group's, with a chevron to fold it, so what
			     opens reads as its contents rather than more items beside it. -->
			<Collapsible.Trigger>
				{#snippet child({ props })}
					<SidebarGroupLabel>
						{#snippet child({ props: labelProps })}
							<button
								{...props}
								{...labelProps}
								type="button"
								data-tour={id ? `group:${id}` : undefined}
								class="{labelProps.class} hover:text-sidebar-foreground w-full cursor-pointer gap-1"
							>
								<span>{label}</span>
								<ChevronRight
									class="size-3.5! transition-transform duration-200 group-data-[state=open]/more:rotate-90"
								/>
							</button>
						{/snippet}
					</SidebarGroupLabel>
				{/snippet}
			</Collapsible.Trigger>
			<!-- With the sidebar folded to icons the heading's hidden: a "…" opens it there. -->
			<SidebarMenu class="hidden group-data-[collapsible=icon]:flex">
				<SidebarMenuItem>
					<Collapsible.Trigger>
						{#snippet child({ props })}
							<SidebarMenuButton {...props} tooltipContent={label} {size} class="cursor-pointer">
								<Ellipsis class="h-4 w-4" />
								<span>{label}</span>
							</SidebarMenuButton>
						{/snippet}
					</Collapsible.Trigger>
				</SidebarMenuItem>
			</SidebarMenu>
			<Collapsible.Content>
				<!-- Indented on a rule under its heading (a nested list's look), except
				     folded to icons, where there's no room to indent. -->
				<SidebarMenu
					class="border-sidebar-border ml-3.5 border-l pl-2 group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:border-l-0 group-data-[collapsible=icon]:pl-0"
				>
					{@render entries()}
				</SidebarMenu>
			</Collapsible.Content>
		</Collapsible.Root>
	{:else}
		{#if label}
			<SidebarGroupLabel>{label}</SidebarGroupLabel>
		{/if}
		<SidebarMenu>
			{@render entries()}
		</SidebarMenu>
	{/if}
</SidebarGroup>
