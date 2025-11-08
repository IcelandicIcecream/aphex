<script lang="ts">
	let { data } = $props();
	import { urlFor } from '$lib/utils/imageBuilder.js';

	const { pageRender } = data;
	const hero = pageRender?.hero;
	const backgroundImage = hero?.backgroundImage;
</script>

{#if pageRender && hero && backgroundImage}
<div>
	<img alt={hero.heading} src={urlFor(backgroundImage)} />
	<h1>{hero.heading}</h1>
	{#if hero.subheading}
		<p>{hero.subheading}</p>
	{/if}
</div>
{/if}
