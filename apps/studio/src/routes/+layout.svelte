<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { AphexLivePreview } from '@aphexcms/cms-core/client';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<AphexLivePreview>
	{@render children?.()}
</AphexLivePreview>
