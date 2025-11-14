<script lang="ts">
	import { Sidebar } from '@aphexcms/cms-core';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { activeTabState } from '$lib/stores/activeTab.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// Get graphqlSettings from page data (child route)
	const enableGraphiQL = $derived(page.data.graphqlSettings?.enableGraphiQL ?? false);

	async function handleSignOut() {
		await authClient.signOut();
		goto(resolve('/login'));
	}
</script>

{#if data?.sidebarData}
	<Sidebar
		data={data.sidebarData}
		onSignOut={handleSignOut}
		{enableGraphiQL}
		activeTab={activeTabState}
	>
		{@render children()}
	</Sidebar>
{:else}
	<div>Loading...</div>
{/if}
