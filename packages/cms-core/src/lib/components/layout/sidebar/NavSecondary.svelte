<script lang="ts">
	import {
		SidebarGroup,
		SidebarGroupContent,
		SidebarMenu,
		SidebarMenuItem,
		SidebarMenuButton
	} from '@aphexcms/ui/shadcn/sidebar';
	import { Sun, Moon } from '@lucide/svelte';
	import { toggleMode } from 'mode-watcher';

	type Props = {
		enableGraphiQL?: boolean;
		activeTab?: 'structure' | 'vision';
		onTabChange?: (tab: 'structure' | 'vision') => void;
	};

	let { enableGraphiQL = false, activeTab = $bindable('structure'), onTabChange }: Props = $props();

	function handleTabClick(tab: 'structure' | 'vision') {
		activeTab = tab;
		if (onTabChange) {
			onTabChange(tab);
		}
	}
</script>

<SidebarGroup class="mt-auto">
	<SidebarGroupContent>
		<SidebarMenu>
			<!-- Structure Tab -->
			<SidebarMenuItem>
				<SidebarMenuButton
					onclick={() => handleTabClick('structure')}
					isActive={activeTab === 'structure'}
					tooltipContent="Structure"
					size="sm"
				>
					<span>Structure</span>
				</SidebarMenuButton>
			</SidebarMenuItem>

			<!-- Vision Tab (if GraphiQL is enabled) -->
			{#if enableGraphiQL}
				<SidebarMenuItem>
					<SidebarMenuButton
						onclick={() => handleTabClick('vision')}
						isActive={activeTab === 'vision'}
						tooltipContent="Vision"
						size="sm"
					>
						<span>Vision</span>
					</SidebarMenuButton>
				</SidebarMenuItem>
			{/if}

			<!-- Theme Toggle -->
			<SidebarMenuItem>
				<SidebarMenuButton onclick={toggleMode} tooltipContent="Toggle theme" size="sm">
					<Sun class="h-4 w-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
					<Moon
						class="absolute h-4 w-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
					/>
					<span>Theme</span>
				</SidebarMenuButton>
			</SidebarMenuItem>
		</SidebarMenu>
	</SidebarGroupContent>
</SidebarGroup>
