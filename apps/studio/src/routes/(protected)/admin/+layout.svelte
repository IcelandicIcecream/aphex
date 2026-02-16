<script lang="ts">
	import { Sidebar } from '@aphexcms/cms-core';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { activeTabState } from '$lib/stores/activeTab.svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: any } = $props();

	// Get graphqlSettings from page data (child route)
	const enableGraphiQL = $derived(page.data.graphqlSettings?.enableGraphiQL ?? false);

	// Restore tab from URL param on load
	const validViews = ['structure', 'vision', 'media'] as const;
	type ViewType = (typeof validViews)[number];

	$effect(() => {
		const viewParam = page.url.searchParams.get('view');
		if (viewParam && validViews.includes(viewParam as ViewType)) {
			activeTabState.value = viewParam as ViewType;
		}
	});

	// Handle tab change — update both state and URL
	function handleTabChange(value: string) {
		activeTabState.value = value as ViewType;

		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (value === 'structure') {
			params.delete('view');
		} else {
			params.set('view', value);
		}
		const query = params.toString();
		goto(`/admin${query ? `?${query}` : ''}`, { replaceState: true, keepFocus: true });
	}

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
		onTabChange={handleTabChange}
	>
		{@render children()}
	</Sidebar>
{:else}
	<div>Loading...</div>
{/if}
