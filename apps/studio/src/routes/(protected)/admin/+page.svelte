<script lang="ts">
	import { AdminApp } from '@aphexcms/cms-core';
	import { schemaTypes } from '$lib/schemaTypes/index';
	import { activeTabState } from '$lib/stores/activeTab.svelte';

	let { data } = $props();

	// Tab change is handled by the layout's onTabChange callback
	// which syncs both activeTabState and URL params
	function handleTabChange(value: string) {
		if (activeTabState) activeTabState.value = value as 'structure' | 'vision' | 'media';
	}
</script>

<AdminApp
	schemas={schemaTypes}
	documentTypes={data.documentTypes}
	schemaError={data.schemaError}
	graphqlSettings={data.graphqlSettings}
	isReadOnly={data.isReadOnly}
	userPreferences={data.userPreferences}
	activeTab={activeTabState}
	{handleTabChange}
	title="Aphex CMS"
/>
