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
	import { ChevronsUpDown, Settings, LogOut, Mail, Shield } from '@lucide/svelte';
	import AssetImage from '../../admin/AssetImage.svelte';
	import type { SidebarUser } from '../../../types/sidebar';

	type Props = {
		user: SidebarUser;
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
					<!-- Declared here, not inside SidebarMenuButton: a snippet that is a
					     direct child of a component is passed to it as a prop. -->
					{#snippet userInitial()}
						<div
							class="bg-sidebar-primary text-sidebar-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold"
						>
							{user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
						</div>
					{/snippet}
					<SidebarMenuButton
						{...props}
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
					>
						<!-- An avatar URL that 404s (a deleted upload, an expired remote
						     avatar) fell through to the browser's broken-image glyph. Route
						     it through AssetImage so a failed load lands on the same initials
						     block as no avatar at all. -->
						<AssetImage
							src={user.image}
							alt={user.name || user.email}
							class="h-8 w-8 rounded-lg object-cover"
							fallback={userInitial}
						/>
						{#if sidebar.isMobile || sidebar.state !== 'collapsed'}
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-medium">{user.name || user.email}</span>
								<span class="text-muted-foreground truncate text-xs">{user.email}</span>
							</div>
							<ChevronsUpDown class="ml-auto size-4" />
						{/if}
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
				<DropdownMenuItem class="cursor-pointer" onclick={() => goto('/admin/settings/account')}>
					<Settings class="mr-2 h-4 w-4" />
					<span>Account Settings</span>
				</DropdownMenuItem>
				<DropdownMenuItem class="cursor-pointer" onclick={() => goto('/invitations')}>
					<Mail class="mr-2 h-4 w-4" />
					<span>Invitations</span>
				</DropdownMenuItem>
				{#if user.role === 'super_admin'}
					<DropdownMenuItem class="cursor-pointer" onclick={() => goto('/god-mode')}>
						<Shield class="mr-2 h-4 w-4" />
						<span>God Mode</span>
					</DropdownMenuItem>
				{/if}
				<DropdownMenuSeparator />
				<DropdownMenuItem class="text-destructive cursor-pointer" onclick={handleSignOut}>
					<LogOut class="mr-2 h-4 w-4" />
					<span>Sign Out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	</SidebarMenuItem>
</SidebarMenu>
