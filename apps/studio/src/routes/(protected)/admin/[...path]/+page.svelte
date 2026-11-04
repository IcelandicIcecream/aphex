<script lang="ts">
	import { AphexStudio } from '@aphexcms/cms-core/client';
	import { aphexClient } from '$lib/aphex.client';
	import { activeTabState } from '$lib/stores/activeTab.svelte';

	let { data } = $props();

	// Tab state + URL sync are still owned by the admin layout's sidebar; pass the
	// store through so the studio view and the sidebar stay in step. This is the
	// one bit not yet in `config` — it moves inside the shell when the admin layout
	// folds into core.
	function handleTabChange(value: string) {
		if (activeTabState) activeTabState.value = value as typeof activeTabState.value;
	}
</script>

<AphexStudio {data} config={aphexClient} activeTab={activeTabState} {handleTabChange} />
