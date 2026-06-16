<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { AphexVisualOverlay } from '@aphexcms/visual-editing';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<AphexVisualOverlay>
	{@render children?.()}
</AphexVisualOverlay>
