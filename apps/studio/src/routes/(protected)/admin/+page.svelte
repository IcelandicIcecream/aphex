<script lang="ts">
	import { AdminApp } from '@aphexcms/cms-core';
	import { schemaTypes } from '$lib/schemaTypes/index';
	import { activeTabState } from '$lib/stores/activeTab.svelte';
	import { page } from '$app/state';

	let { data } = $props();

	// Capabilities + role come from the parent admin layout's rbac payload so
	// AdminApp (and its descendants) can gate individual actions per-capability
	// and apply field-level role-list access.
	const capabilities = $derived(page.data.rbac?.capabilities ?? []);
	const rbacRole = $derived(page.data.rbac?.role ?? null);

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
	{capabilities}
	{rbacRole}
	userPreferences={data.userPreferences}
	activeTab={activeTabState}
	{handleTabChange}
	title="Aphex CMS"
/>
