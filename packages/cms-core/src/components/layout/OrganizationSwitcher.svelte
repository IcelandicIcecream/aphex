<script lang="ts">
	import { organizations } from '../../api/index.js';
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
	} from '@aphex/ui/shadcn/dropdown-menu';
	import {
		SidebarMenu,
		SidebarMenuItem,
		SidebarMenuButton,
		useSidebar
	} from '@aphex/ui/shadcn/sidebar';
	import type { SidebarOrganization } from '../../types/sidebar.js';

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
		<DropdownMenu onOpenChange={onOpenChange}>
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
								<span class="truncate text-xs text-muted-foreground">
									{getRoleLabel(activeOrganization.role)}
								</span>
							</div>
						{:else}
							<div class="bg-muted flex aspect-square size-8 items-center justify-center rounded-lg">
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
				{#each orgs as org, index (org.id)}
					<DropdownMenuItem
						onSelect={() => handleSwitchOrganization(org)}
						class="gap-2 p-2"
						disabled={isSwitching || org.id === activeOrganization?.id}
					>
						<div class="flex size-6 items-center justify-center rounded-md border text-xs font-semibold">
							{getOrganizationInitials(org.name)}
						</div>
						<div class="flex flex-1 flex-col">
							<span class="text-sm">{org.name}</span>
							<span class="text-xs text-muted-foreground">{getRoleLabel(org.role)}</span>
						</div>
						{#if org.id === activeOrganization?.id}
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
								class="text-primary"
							>
								<path d="M20 6 9 17l-5-5" />
							</svg>
						{/if}
					</DropdownMenuItem>
				{/each}
				<DropdownMenuSeparator />
				<DropdownMenuItem onSelect={() => goto('/admin/organizations')} class="gap-2 p-2">
					<button class="text-muted-foreground font-medium">View all organizations</button>
				</DropdownMenuItem>
				{#if canCreateOrganization}
					<DropdownMenuSeparator />
					<DropdownMenuItem class="gap-2 p-2">
						<div
							class="flex size-6 items-center justify-center rounded-md border bg-transparent"
						>
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
						<button class="text-muted-foreground font-medium" onclick={()=> {goto('/admin/organizations?action=create')}}>Create organization</button>
					</DropdownMenuItem>
				{/if}
			</DropdownMenuContent>
		</DropdownMenu>
	</SidebarMenuItem>
</SidebarMenu>
