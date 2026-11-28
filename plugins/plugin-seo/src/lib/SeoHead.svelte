<script lang="ts">
	// The tags for a page's <head>, from `resolveSeo` (./head.ts).
	import type { SeoMeta } from './head';

	let { meta }: { meta: SeoMeta } = $props();
</script>

<svelte:head>
	<title>{meta.title}</title>
	<link rel="canonical" href={meta.canonical} />
	{#if meta.description}<meta name="description" content={meta.description} />{/if}
	{#if meta.robots}<meta name="robots" content={meta.robots} />{/if}

	<meta property="og:type" content={meta.type} />
	<meta property="og:url" content={meta.canonical} />
	<meta property="og:title" content={meta.headline} />
	{#if meta.siteName}<meta property="og:site_name" content={meta.siteName} />{/if}
	{#if meta.description}<meta property="og:description" content={meta.description} />{/if}
	{#if meta.image}
		<meta property="og:image" content={meta.image.url} />
		{#if meta.image.width && meta.image.height}
			<meta property="og:image:width" content={String(meta.image.width)} />
			<meta property="og:image:height" content={String(meta.image.height)} />
		{/if}
		{#if meta.image.alt}<meta property="og:image:alt" content={meta.image.alt} />{/if}
	{/if}

	<meta name="twitter:card" content={meta.image ? 'summary_large_image' : 'summary'} />
</svelte:head>
