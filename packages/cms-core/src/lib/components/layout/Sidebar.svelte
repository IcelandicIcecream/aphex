<script lang="ts">
	import { SidebarProvider, SidebarInset, SidebarTrigger } from '@aphexcms/ui/shadcn/sidebar';
	import { Separator } from '@aphexcms/ui/shadcn/separator';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import * as Sheet from '@aphexcms/ui/shadcn/sheet';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '@aphexcms/ui/shadcn/sonner';
	import { Sun, Moon, Sparkles } from '@lucide/svelte';
	import { toggleMode } from 'mode-watcher';
	import { page } from '$app/state';
	import type { SidebarData } from '../../types/sidebar';
	import AppSidebar from './sidebar/AppSidebar.svelte';
	import { usePermissions } from '../../permissions-context.svelte';
	import { setAdminSlots } from '../../admin/slots.svelte';
	import type { AdminArea } from '../../admin/types';
	import type { CMSPlugin, AdminToolPart } from '../../plugins/types';
	import AgentChat from '../admin/AgentChat.svelte';

	// Admin extension-slot registry, published to the whole admin subtree. The
	// navbar renders `navbar-start` / `navbar-end` outlets; the document editor (and
	// later, plugins) register controls into them so everything lives in one bar.
	const slots = setAdminSlots();

	type Props = {
		data: SidebarData;
		onSignOut?: () => void | Promise<void>;
		children: any;
		enableGraphiQL?: boolean;
		enableAssistant?: boolean;
		activeTab?: { value: AdminArea };
		onTabChange?: (value: string) => void;
		/** Plugin registry — used to render sidebar-placed admin tools as persistent nav. */
		plugins?: CMSPlugin[];
	};

	let {
		data,
		onSignOut,
		children,
		enableGraphiQL = false,
		enableAssistant = false,
		activeTab,
		onTabChange,
		plugins = []
	}: Props = $props();
	let assistantOpen = $state(false);

	function switchTab(value: AdminArea) {
		if (onTabChange) {
			onTabChange(value);
		} else if (activeTab) {
			activeTab.value = value;
		}
	}

	// Sidebar-placed admin tools (`placement: 'sidebar'`). Rendered here at the
	// persistent layout level — not via AdminApp's slot — so the Tools nav stays
	// visible on every admin page (settings included), where AdminApp isn't mounted.
	// Capability-filtered with the same rule the part resolver uses.
	const perms = usePermissions();
	const sidebarTools = $derived(
		(plugins ?? [])
			.flatMap((p) => p.parts ?? [])
			.filter(
				(part): part is AdminToolPart =>
					part.implements === 'aphex/admin/tool' && part.placement === 'sidebar'
			)
			.filter(
				(t) => !t.requiredCapabilities?.length || t.requiredCapabilities.every((c) => perms.can(c))
			)
			.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
	);

	// Only show tabs on the main /admin page
	const showTabs = $derived(page.url.pathname === '/admin');

	// Tab-level capability gates. Structure is always visible (it's the
	// document list — a user without `document.read` won't be on /admin at
	// all). Media needs asset.read; Vision is dev-only so we leave it to
	// `enableGraphiQL` alone.
	const canSeeMedia = $derived(perms.can('asset.read'));
</script>

<ModeWatcher />
<Toaster closeButton />
<SidebarProvider class="h-screen">
	<AppSidebar {data} {onSignOut} {sidebarTools} onSelectTool={(id) => switchTab(`plugin:${id}`)} />
	<SidebarInset class="flex h-full min-w-0 flex-col">
		<header
			class="border-rule flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
		>
			<div class="flex w-full items-center gap-2 px-4">
				<!-- Left: Trigger, Separator, and navbar-start slot (e.g. editor breadcrumb) -->
				<div class="flex min-w-0 items-center gap-2">
					<SidebarTrigger class="-ml-1" />
					<Separator orientation="vertical" class="h-4" />
					{#each slots.get('navbar-start') as entry (entry.id)}
						{@render entry.snippet()}
					{/each}
				</div>

				<!-- Center: Structure/Vision/Media Tabs (only on /admin page) -->
				{#if showTabs && activeTab}
					<div
						class="bg-muted text-muted-foreground mx-auto inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]"
					>
						<button
							onclick={() => switchTab('structure')}
							class="{activeTab.value === 'structure'
								? 'bg-background text-foreground shadow'
								: 'text-muted-foreground'} ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
						>
							Structure
						</button>
						{#if enableGraphiQL}
							<button
								onclick={() => switchTab('vision')}
								class="{activeTab.value === 'vision'
									? 'bg-background text-foreground shadow'
									: 'text-muted-foreground'} ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
							>
								Vision
							</button>
						{/if}
						{#if canSeeMedia}
							<button
								onclick={() => switchTab('media')}
								class="{activeTab.value === 'media'
									? 'bg-background text-foreground shadow'
									: 'text-muted-foreground'} ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
							>
								Media
							</button>
						{/if}
						<!-- Plugin admin-tool tabs register here (see AdminApp). -->
						{#each slots.get('admin-tabs') as entry (entry.id)}
							{@render entry.snippet()}
						{/each}
					</div>
				{/if}

				<!-- Right: navbar-end slot (e.g. editor actions) + Theme Toggle -->
				<div class="flex items-center gap-2 {showTabs ? '' : 'ml-auto'}">
					{#each slots.get('navbar-end') as entry (entry.id)}
						{@render entry.snippet()}
					{/each}
					<Button onclick={toggleMode} variant="outline" size="icon" class="cursor-pointer">
						<Sun
							class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
						/>
						<Moon
							class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
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
	{#if enableAssistant && !assistantOpen}
		<Button
			size="icon-lg"
			class="fixed right-5 bottom-20 z-50 size-12 rounded-full shadow-lg sm:right-6"
			onclick={() => (assistantOpen = true)}
			aria-label="Open Aphex Assistant"
		>
			<Sparkles class="size-5" />
		</Button>
	{/if}
	<Sheet.Root bind:open={assistantOpen}>
		<Sheet.Content class="w-full gap-0 p-0 sm:max-w-xl">
			<Sheet.Header class="sr-only">
				<Sheet.Title>Aphex Assistant</Sheet.Title>
				<Sheet.Description>CMS-aware answers and content tools</Sheet.Description>
			</Sheet.Header>
			<AgentChat embedded />
		</Sheet.Content>
	</Sheet.Root>
</SidebarProvider>
