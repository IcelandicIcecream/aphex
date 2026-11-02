<script lang="ts">
	import { AphexStudio } from '@aphexcms/cms-core/client';
	import { schemaTypes } from '$lib/schemaTypes/index';
	import { plugins } from '$lib/plugins';
	import EmbedPreview from '$lib/components/studio/EmbedPreview.svelte';
	import { activeTabState } from '$lib/stores/activeTab.svelte';

	// Inline editor previews for custom rich-text blocks — the real embed renders
	// as you write, instead of a generic card. Presentation stays app-owned.
	const blockPreviews = { embed: EmbedPreview };

	let { data } = $props();

	// Tab state + URL sync are still owned by the admin layout's sidebar; pass the
	// store through so AphexStudio's dashboard view and the sidebar stay in step.
	function handleTabChange(value: string) {
		if (activeTabState) activeTabState.value = value as typeof activeTabState.value;
	}
</script>

<AphexStudio
	{data}
	schemas={schemaTypes}
	{plugins}
	{blockPreviews}
	activeTab={activeTabState}
	{handleTabChange}
	title="Aphex CMS"
/>
