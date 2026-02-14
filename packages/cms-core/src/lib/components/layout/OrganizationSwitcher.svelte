<script lang="ts">
	import { organizations } from '../../api/index';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuLabel,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '@aphexcms/ui/shadcn/dropdown-menu';
	import {
		SidebarMenu,
		SidebarMenuItem,
		SidebarMenuButton,
		useSidebar
	} from '@aphexcms/ui/shadcn/sidebar';
	import type { SidebarOrganization } from '../../types/sidebar';

	type Props = {
		organizations?: SidebarOrganization[];
		activeOrganization?: SidebarOrganization;
		canCreateOrganization?: boolean;
		onOpenChange?: (open: boolean) => void;
	};

	let {
		organizations: orgs = [],
		activeOrganization,
		canCreateOrganization = false,
		onOpenChange
	}: Props = $props();

	const sidebar = useSidebar();

	let isSwitching = $state(false);

	// Set initial orgId in URL if not present
	$effect(() => {
		if (activeOrganization && !page.url.searchParams.has('orgId')) {
			const params = new SvelteURLSearchParams(page.url.searchParams);
			params.set('orgId', activeOrganization.id);
			goto(`${page.url.pathname}?${params.toString()}`, { replaceState: true });
		}
	});

	async function handleSwitchOrganization(org: SidebarOrganization) {
		if (org.id === activeOrganization?.id) return;

		isSwitching = true;
		try {
			// Switch organization on the server
			await organizations.switch({ organizationId: org.id });

			// Update URL with new orgId and clear editor state
			const params = new SvelteURLSearchParams();
			params.set('orgId', org.id);

			// Preserve docType if present, but clear editor-specific params
			const currentDocType = page.url.searchParams.get('docType');
			if (currentDocType) {
				params.set('docType', currentDocType);
			}

			await goto(`${page.url.pathname}?${params.toString()}`, { replaceState: false });

			// Invalidate all data to refetch with new organization context
			await invalidateAll();
		} catch (error) {
			console.error('Failed to switch organization:', error);
			// TODO: Show error toast
		} finally {
			isSwitching = false;
		}
	}

	function getOrganizationInitials(name: string): string {
		return name
			.split(' ')
			.map((word) => word[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	function getRoleLabel(role: string): string {
		return role.charAt(0).toUpperCase() + role.slice(1);
	}
</script>

<SidebarMenu>
	<SidebarMenuItem>
		<DropdownMenu {onOpenChange}>
			<DropdownMenuTrigger>
				{#snippet child({ props })}
					<SidebarMenuButton
						{...props}
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						disabled={isSwitching}
					>
						{#if activeOrganization}
							<div
								class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg text-sm font-semibold"
							>
								{getOrganizationInitials(activeOrganization.name)}
							</div>
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-medium">
									{activeOrganization.name}
								</span>
								<span class="text-muted-foreground truncate text-xs">
									{getRoleLabel(activeOrganization.role)}
								</span>
							</div>
						{:else}
							<div
								class="bg-muted flex aspect-square size-8 items-center justify-center rounded-lg"
							>
								<span class="text-muted-foreground text-xs">?</span>
							</div>
							<span class="text-muted-foreground">No organization</span>
						{/if}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							class="ml-auto"
						>
							<path d="m7 15 5 5 5-5" />
							<path d="m7 9 5-5 5 5" />
						</svg>
					</SidebarMenuButton>
				{/snippet}
			</DropdownMenuTrigger>
			<DropdownMenuContent
				class="w-[--bits-dropdown-menu-anchor-width] min-w-56 rounded-lg"
				align="start"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				sideOffset={4}
			>
				<DropdownMenuLabel class="text-muted-foreground text-xs">Organizations</DropdownMenuLabel>
				<div class="p-1">
					{#each orgs as org (org.id)}
						{@const isActive = org.id === activeOrganization?.id}
						<button
							class="hover:bg-muted/50 flex w-full items-start gap-3 rounded-md px-2 py-2 text-left text-sm"
							onclick={() => handleSwitchOrganization(org)}
							disabled={isSwitching}
						>
							<div
								class="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold"
							>
								{getOrganizationInitials(org.name)}
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex items-center justify-between">
									<p class="truncate font-medium">{org.name}</p>
									{#if isActive}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="16"
											height="16"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
											class="text-primary shrink-0"
										>
											<path d="M20 6 9 17l-5-5" />
										</svg>
									{/if}
								</div>
								<p class="text-muted-foreground text-xs capitalize">{getRoleLabel(org.role)}</p>
								{#if isActive}
									<div class="mt-1.5 flex gap-1">
										<button
											class="hover:bg-accent hover:text-accent-foreground flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors"
											onclick={(e) => { e.stopPropagation(); goto('/admin/settings'); }}
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
											Settings
										</button>
										<button
											class="hover:bg-accent hover:text-accent-foreground flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors"
											onclick={(e) => { e.stopPropagation(); goto('/admin/settings/members'); }}
										>
											<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
											Invite members
										</button>
									</div>
								{/if}
							</div>
						</button>
					{/each}
				</div>
				{#if canCreateOrganization}
					<DropdownMenuSeparator />
					<DropdownMenuItem
						class="gap-2 p-2"
						onclick={() => goto('/admin/organizations?action=create')}
					>
						<div class="flex size-6 items-center justify-center rounded-md border bg-transparent">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M5 12h14" />
								<path d="M12 5v14" />
							</svg>
						</div>
						<span class="text-muted-foreground font-medium">Create organization</span>
					</DropdownMenuItem>
				{/if}
			</DropdownMenuContent>
		</DropdownMenu>
	</SidebarMenuItem>
</SidebarMenu>
