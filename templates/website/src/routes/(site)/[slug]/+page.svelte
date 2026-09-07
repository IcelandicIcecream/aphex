<script lang="ts">
	import PageRender from '$lib/components/PageRender.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const siteName = $derived(data.settings?.title || 'Aphex');
</script>

<PageRender page={data.page} {siteName} signedIn={data.signedIn} />
