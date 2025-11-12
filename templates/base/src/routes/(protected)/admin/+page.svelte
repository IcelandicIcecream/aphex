<script lang="ts">
	import type { PageData } from './$types';
	import { AdminApp } from '@aphexcms/cms-core';
	import { schemaTypes } from '$lib/schemaTypes/index.js';
	import { activeTabState } from '$lib/stores/activeTab.svelte';

	let { data }: { data: PageData } = $props();

	// Handler for when tabs change (instead of bind:value)
	function handleTabChange(value: string) {
		if (activeTabState) activeTabState.value = value as 'structure' | 'vision';
	}
</script>

<svelte:head>
	<title>Aphex CMS - Admin Dashboard</title>
	<meta
		name="description"
		content="Manage your content, schemas, and configurations in the Aphex CMS admin dashboard."
	/>
</svelte:head>

<AdminApp
	schemas={schemaTypes}
	documentTypes={data.documentTypes}
	schemaError={data.schemaError}
	graphqlSettings={data.graphqlSettings}
	isReadOnly={data.isReadOnly}
	activeTab={activeTabState}
	{handleTabChange}
	title="Aphex CMS"
/>
