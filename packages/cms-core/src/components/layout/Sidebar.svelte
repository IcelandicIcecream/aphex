<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import {
		SidebarProvider,
		Sidebar,
		SidebarContent,
		SidebarHeader,
		SidebarMenu,
		SidebarMenuItem,
		SidebarMenuButton,
		SidebarInset,
		SidebarFooter
	} from '@aphex/ui/shadcn/sidebar';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '@aphex/ui/shadcn/dropdown-menu';
	import { ModeWatcher } from 'mode-watcher';
	import { PanelRight, PanelRightClose } from 'lucide-svelte';
	import type { SidebarData } from '../../types/sidebar.js';
	import OrganizationSwitcher from './OrganizationSwitcher.svelte';

	type Props = {
		data?: SidebarData;
		onSignOut?: () => void | Promise<void>;
		children: any;
	};

	let { data, onSignOut, children }: Props = $props();

	// Sidebar state - start collapsed by default
	let sidebarOpen = $state(false);
	let isHovering = $state(false);
	let isLocked = $state(false); // Track if sidebar is locked open
	let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
	let openTimeout: ReturnType<typeof setTimeout> | null = null;

	// Use navItems from data or default
	const navItems = $derived(data?.navItems || [{ href: '/admin', label: 'Content', icon: '📝' }]);

	let currentPath = $derived(page.url.pathname);

	async function handleSignOut() {
		if (onSignOut) {
			await onSignOut();
		}
	}

	function handleSidebarMouseEnter() {
		if (hoverTimeout) clearTimeout(hoverTimeout);
		if (!sidebarOpen && !isLocked) {
			isHovering = true;
			// Add delay before opening
			openTimeout = setTimeout(() => {
				if (isHovering) {
					sidebarOpen = true;
				}
			}, 300); // 300ms delay before opening
		}
	}

	function handleSidebarMouseLeave() {
		// Clear open timeout if user leaves before sidebar opens
		if (openTimeout) {
			clearTimeout(openTimeout);
			openTimeout = null;
		}

		if (isHovering && !isLocked) {
			hoverTimeout = setTimeout(() => {
				sidebarOpen = false;
				isHovering = false;
			}, 300);
		}
	}

	function toggleLock() {
		isLocked = !isLocked;
		if (isLocked) {
			// Lock the sidebar open
			if (hoverTimeout) clearTimeout(hoverTimeout);
			sidebarOpen = true;
			isHovering = false;
		} else {
			// Unlock - if mouse is not over sidebar, close it
			if (!isHovering) {
				sidebarOpen = false;
			}
		}
	}
</script>

<ModeWatcher />
<SidebarProvider bind:open={sidebarOpen}>
	<div>
		<Sidebar
			collapsible="icon"
			mode={isLocked ? 'push' : 'overlay'}
			onmouseenter={handleSidebarMouseEnter}
			onmouseleave={handleSidebarMouseLeave}
		>
			<SidebarHeader>
				<div class="flex items-center justify-between gap-2">
					<div class="flex-1">
						<!-- Organization Switcher -->
						{#if data?.organizations && data.organizations.length > 0}
							<OrganizationSwitcher
								organizations={data.organizations}
								activeOrganization={data.activeOrganization}
								canCreateOrganization={data.user?.role === 'super_admin'}
								onOpenChange={(open) => {
									if (open && !isLocked) {
										isLocked = true;
										sidebarOpen = true;
										isHovering = false;
									}
								}}
							/>
						{/if}
					</div>
					<!-- Lock/Pin Button -->
					<button
						onclick={toggleLock}
						class="group-data-[collapsible=icon]:hidden flex h-8 w-8 items-center justify-center rounded-md hover:bg-sidebar-accent transition-colors"
						title={isLocked ? 'Unlock sidebar' : 'Lock sidebar open'}
					>
						{#if isLocked}
							<PanelRightClose size={16} />
						{:else}
							<PanelRight size={16} />
						{/if}
					</button>
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarMenu>
					{#each navItems as item, index (index)}
						<SidebarMenuItem>
							<SidebarMenuButton
								onclick={() => goto(item.href)}
								isActive={currentPath.startsWith(item.href)}
							>
								<span>{item.icon}</span>
								<span>{item.label}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					{/each}
				</SidebarMenu>
			</SidebarContent>

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						{#if data?.user}
							<DropdownMenu>
								<DropdownMenuTrigger>
									{#snippet child({ props })}
										<SidebarMenuButton
											{...props}
											class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
										>
											{#if data.user.image}
												<img
													src={data.user.image}
													alt={data.user.name}
													class="h-8 w-8 rounded-full"
												/>
											{:else}
												<div
													class="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full"
												>
													{data.user.name?.[0]?.toUpperCase() || data.user.email[0].toUpperCase()}
												</div>
											{/if}
											<div class="flex flex-col items-start">
												<span class="text-sm font-medium">{data.user.name || data.user.email}</span>
												{#if data.user.role}
													<span class="text-muted-foreground text-xs">{data.user.role}</span>
												{/if}
											</div>
										</SidebarMenuButton>
									{/snippet}
								</DropdownMenuTrigger>
								<DropdownMenuContent side="top" class="w-[--bits-dropdown-menu-anchor-width]">
									<div class="px-2 py-1.5 text-sm">
										<p class="font-medium">{data.user.name || 'User'}</p>
										<p class="text-muted-foreground text-xs">{data.user.email}</p>
									</div>
									<DropdownMenuSeparator />
									<DropdownMenuItem onclick={() => goto('/admin/settings')}>
										<span>⚙️</span>
										<span class="ml-2">Account Settings</span>
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem class="text-destructive" onclick={handleSignOut}>
										<span>🚪</span>
										<span class="ml-2">Sign Out</span>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						{:else}
							<SidebarMenuButton>
								<div class="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
									👤
								</div>
								<span>Loading...</span>
							</SidebarMenuButton>
						{/if}
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	</div>

	<SidebarInset>
		<main class="flex-1 overflow-hidden">
			{@render children()}
		</main>
	</SidebarInset>
</SidebarProvider>
