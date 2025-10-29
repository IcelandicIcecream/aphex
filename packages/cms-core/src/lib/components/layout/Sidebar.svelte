<script lang="ts">
	import { SidebarProvider, SidebarInset, SidebarTrigger } from '@aphexcms/ui/shadcn/sidebar';
	import { Separator } from '@aphexcms/ui/shadcn/separator';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { ModeWatcher } from 'mode-watcher';
	import { Sun, Moon } from 'lucide-svelte';
	import { toggleMode } from 'mode-watcher';
	import { page } from '$app/state';
	import type { SidebarData } from '../../types/sidebar.js';
	import AppSidebar from './sidebar/AppSidebar.svelte';

	type Props = {
		data: SidebarData;
		onSignOut?: () => void | Promise<void>;
		children: any;
		enableGraphiQL?: boolean;
		activeTab?: { value: 'structure' | 'vision' };
	};

	let { data, onSignOut, children, enableGraphiQL = false, activeTab }: Props = $props();

	// Only show tabs on the main /admin page
	const showTabs = $derived(page.url.pathname === '/admin');
</script>

<ModeWatcher />
<SidebarProvider class="h-screen">
	<AppSidebar {data} {onSignOut} />
	<SidebarInset class="flex h-full flex-col">
		<header
			class="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
		>
			<div class="flex w-full items-center px-4" class:justify-between={showTabs}>
				<!-- Left: Trigger and Separator -->
				<div class="flex items-center gap-2">
					<SidebarTrigger class="-ml-1" />
					<Separator orientation="vertical" class="mr-2 h-4" />
				</div>

				<!-- Center: Structure/Vision Tabs (only on /admin page) -->
				{#if showTabs && activeTab}
					<div
						class="bg-muted text-muted-foreground mx-auto inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]"
					>
						<button
							onclick={() => {
								if (activeTab) activeTab.value = 'structure';
							}}
							class="{activeTab.value === 'structure'
								? 'bg-background text-foreground shadow'
								: 'text-muted-foreground'} ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
						>
							Structure
						</button>
						{#if enableGraphiQL}
							<button
								onclick={() => {
									if (activeTab) activeTab.value = 'vision';
								}}
								class="{activeTab.value === 'vision'
									? 'bg-background text-foreground shadow'
									: 'text-muted-foreground'} ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
							>
								Vision
							</button>
						{/if}
					</div>
				{/if}

				<!-- Right: Theme Toggle -->
				<div class:ml-auto={!showTabs}>
					<Button onclick={toggleMode} variant="outline" size="icon">
						<Sun
							class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
						/>
						<Moon
							class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
						/>
						<span class="sr-only">Toggle theme</span>
					</Button>
				</div>
			</div>
		</header>
		<main class="flex flex-1 flex-col overflow-hidden pt-0">
			{@render children()}
		</main>
	</SidebarInset>
</SidebarProvider>
