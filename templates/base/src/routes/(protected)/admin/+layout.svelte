<script lang="ts">
	import { Sidebar } from '@aphexcms/cms-core';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { activeTabState } from '$lib/stores/activeTab.svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Home } from '@lucide/svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// Get graphqlSettings from page data (child route)
	const enableGraphiQL = $derived(page.data.graphqlSettings?.enableGraphiQL ?? false);

	async function handleSignOut() {
		await authClient.signOut();
		goto(resolve('/'));
	}
</script>

{#if data?.sidebarData}
	<div class="flex h-screen flex-col">
		<!-- Banner to go back to home page -->
		<div class="bg-muted/50 flex items-center justify-between border-b px-4 py-2">
			<div class="flex items-center gap-2">
				<Home class="text-muted-foreground h-4 w-4" />
				<span class="text-muted-foreground text-sm">Admin Panel</span>
			</div>
			<Button variant="ghost" size="sm" href="/">← Back to Home</Button>
		</div>

		<!-- Main sidebar content -->
		<div class="flex-1 overflow-hidden">
			<Sidebar
				data={data.sidebarData}
				onSignOut={handleSignOut}
				{enableGraphiQL}
				activeTab={activeTabState}
			>
				{@render children()}
			</Sidebar>
		</div>
	</div>
{:else}
	<div>Loading...</div>
{/if}
