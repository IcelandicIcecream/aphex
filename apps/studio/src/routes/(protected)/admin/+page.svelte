<script lang="ts">
	import { AdminApp } from '@aphexcms/cms-core';
	import { schemaTypes } from '$libz/sz//schemaTypes/index.js';
	import { activeTabState } from '$lib/stores/activeTab.svelte';

	let { data } = $props();

	// Handler for when tabs change (instead of bind:value)
	function handleTabChange(value: string) {
		if (activeTabState) activeTabState.value = value as 'structure' | 'vision';
	}


</script>

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
