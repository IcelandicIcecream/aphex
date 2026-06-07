<script lang="ts">
	let { data } = $props();
	import { urlFor } from '$lib/utils/imageBuilder.js';

	const pageRender = $derived(data.pageRender);
	const hero = $derived(pageRender?.hero);
	const backgroundImage = $derived(hero?.backgroundImage);
</script>

{#if pageRender}
	{JSON.stringify(pageRender)}
	{#if hero && backgroundImage}
		<div>
			<img alt={hero.heading} src={urlFor(backgroundImage).url()} />
			<h1>{hero.heading}</h1>
			{#if hero.subheading}
				<p>{hero.subheading}</p>
			{/if}
		</div>
	{/if}
{/if}
