<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		SidebarMenu,
		SidebarMenuItem,
		SidebarMenuButton,
		useSidebar
	} from '@aphexcms/ui/shadcn/sidebar';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '@aphexcms/ui/shadcn/dropdown-menu';
	import { ChevronsUpDown, Settings, LogOut } from '@lucide/svelte';
	import type { AuthUser } from '../../../types/user';

	type Props = {
		user: AuthUser;
		onSignOut?: () => void | Promise<void>;
	};

	let { user, onSignOut }: Props = $props();

	const sidebar = useSidebar();

	async function handleSignOut() {
		if (onSignOut) {
			await onSignOut();
		}
	}
</script>

<SidebarMenu>
	<SidebarMenuItem>
		<DropdownMenu>
			<DropdownMenuTrigger>
				{#snippet child({ props })}
					<SidebarMenuButton
						{...props}
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
					>
						{#if user.image}
							<img src={user.image} alt={user.name || user.email} class="h-8 w-8 rounded-lg" />
						{:else}
							<div
								class="bg-sidebar-primary text-sidebar-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold"
							>
								{user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
							</div>
						{/if}
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-medium">{user.name || user.email}</span>
							<span class="text-muted-foreground truncate text-xs">{user.email}</span>
						</div>
						<ChevronsUpDown class="ml-auto size-4" />
					</SidebarMenuButton>
				{/snippet}
			</DropdownMenuTrigger>
			<DropdownMenuContent
				class="w-[--bits-dropdown-menu-anchor-width] min-w-56 rounded-lg"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				align="end"
				sideOffset={4}
			>
				<div class="px-2 py-1.5 text-sm">
					<p class="font-medium">{user.name || 'User'}</p>
					<p class="text-muted-foreground text-xs">{user.email}</p>
				</div>
				<DropdownMenuSeparator />
				<DropdownMenuItem onclick={() => goto('/admin/settings')}>
					<Settings class="mr-2 h-4 w-4" />
					<span>Account Settings</span>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem class="text-destructive" onclick={handleSignOut}>
					<LogOut class="mr-2 h-4 w-4" />
					<span>Sign Out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	</SidebarMenuItem>
</SidebarMenu>
