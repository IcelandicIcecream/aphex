<script lang="ts">
	/**
	 * Low impact — text only, on a narrow measure. The default, and the right
	 * choice for most pages: an About page doesn't need a photograph to justify
	 * its existence.
	 */
	import RichText from '$lib/components/RichText.svelte';
	import CMSLink from '$lib/components/CMSLink.svelte';
	import { control } from '$lib/utils/stega';
	import type { HeroValue } from './types';

	let { hero }: { hero: HeroValue } = $props();

	const links = $derived((hero.links ?? []).slice(0, 2));

	// A branch, so it's cleaned — a stega'd `'center'` matches nothing and the
	// hero silently falls back to left. See $lib/utils/stega.ts.
	// `mx-auto` as well as `text-center`: the measure is capped, so centring the
	// text inside a left-hugging column would leave it centred in the wrong place.
	const centred = $derived(control(hero.align) === 'center');
</script>

<section class="container pt-16 pb-4 md:pt-24">
	<div
		class="[&_p]:text-muted-foreground max-w-2xl [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight sm:[&_h1]:text-4xl [&_p]:mt-4 [&_p]:text-lg {centred
			? 'mx-auto text-center'
			: ''}"
	>
		<RichText value={hero.richText} class="text-balance" />

		{#if links.length}
			<div class="mt-6 flex flex-wrap gap-3 {centred ? 'justify-center' : ''}">
				{#each links as link, i (i)}
					<CMSLink {link} appearance={control(link.appearance) ?? 'default'} />
				{/each}
			</div>
		{/if}
	</div>
</section>
