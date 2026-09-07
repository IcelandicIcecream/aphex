<script lang="ts">
	/**
	 * Medium impact — the copy, then the image beneath it.
	 *
	 * The one that suits most pages: it gives an image real presence without
	 * asking it to carry text, so a screenshot or a diagram (which a scrim would
	 * ruin) works as well as a photograph.
	 */
	import { Image } from '@aphexcms/cms-core/image';
	import { usePreview } from '@aphexcms/visual-editing';
	import RichText from '$lib/components/RichText.svelte';
	import CMSLink from '$lib/components/CMSLink.svelte';
	import { control } from '$lib/utils/stega';
	import type { HeroValue } from './types';

	let { hero }: { hero: HeroValue } = $props();

	const links = $derived((hero.links ?? []).slice(0, 2));

	// See HighImpact for why an image needs these attributes and text doesn't.
	const ve = usePreview();

	// No `align` here on purpose. The field is offered for low impact only, and a
	// hidden field keeps its stored value — so reading it would leave a hero
	// switched from low to medium centred, with no control on screen to undo it.
</script>

<section class="container pt-16 pb-8 md:pt-24">
	<div
		class="[&_p]:text-muted-foreground max-w-3xl [&_h1]:text-4xl [&_h1]:font-semibold [&_h1]:tracking-tight sm:[&_h1]:text-5xl [&_p]:mt-5 [&_p]:max-w-xl [&_p]:text-lg"
	>
		<RichText value={hero.richText} class="text-balance" />

		{#if links.length}
			<div class="mt-8 flex flex-wrap gap-3">
				{#each links as link, i (i)}
					<CMSLink {link} appearance={control(link.appearance) ?? 'default'} />
				{/each}
			</div>
		{/if}
	</div>

	{#if hero.media?.asset?.url}
		<div
			class="bg-muted mt-12 overflow-hidden rounded-xl border"
			{...ve.edit({ field: 'hero.media' })}
		>
			<Image
				value={hero.media}
				sizes="(min-width: 80rem) 76rem, 100vw"
				priority
				class="h-auto w-full"
			/>
		</div>
	{/if}
</section>
