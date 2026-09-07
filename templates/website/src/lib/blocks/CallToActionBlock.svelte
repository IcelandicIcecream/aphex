<script lang="ts">
	/** Call to action — a pitch in a bordered panel with up to two buttons. */
	import { usePreview } from '@aphexcms/visual-editing';
	import RichText from '$lib/components/RichText.svelte';
	import CMSLink from '$lib/components/CMSLink.svelte';
	import { control } from '$lib/utils/stega';
	import type { CallToActionBlockValue } from './types';

	/**
	 * `index` is this block's row in `layout`, and it is spread onto the section as
	 * `ve.edit({ field: 'layout', arrayIndex: index })`.
	 *
	 * Every page-builder block needs this. Text carries its own click-to-edit
	 * markers, but only the text does — the padding around it, a button, a card, an
	 * empty archive grid, all of it is unclickable without an explicit target. And
	 * an editor who clicks a block expects to land on *that row* of the page
	 * builder, not on the top of the `layout` array.
	 */
	let { block, index }: { block: CallToActionBlockValue; index?: number } = $props();

	const links = $derived((block.links ?? []).slice(0, 2));

	const ve = usePreview();
</script>

<section class="container my-12" {...ve.edit({ field: 'layout', arrayIndex: index })}>
	<div
		class="bg-card flex flex-col gap-6 rounded-xl border p-8 md:flex-row md:items-center md:justify-between md:p-10"
	>
		<div class="max-w-xl">
			<RichText value={block.richText} />
		</div>

		{#if links.length}
			<div class="flex shrink-0 flex-wrap gap-3">
				{#each links as link, i (i)}
					<CMSLink {link} appearance={control(link.appearance) ?? 'default'} />
				{/each}
			</div>
		{/if}
	</div>
</section>
