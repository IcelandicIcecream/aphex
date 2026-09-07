<script lang="ts">
	/**
	 * Content — one to four columns of rich text on a 12-column grid.
	 *
	 * The `size` an editor picks maps to a column span, so `half` + `half` sit
	 * side by side and a `full` takes the row. Below `md` everything is full
	 * width: a third of a phone screen is not a column, it's a margin.
	 *
	 * The span classes are written out in full because Tailwind scans source text
	 * for complete class names — a `md:col-span-${n}` built at runtime is never
	 * emitted into the stylesheet.
	 */
	import { usePreview } from '@aphexcms/visual-editing';
	import RichText from '$lib/components/RichText.svelte';
	import CMSLink from '$lib/components/CMSLink.svelte';
	import { control } from '$lib/utils/stega';
	import type { ContentBlockValue } from './types';

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
	let { block, index }: { block: ContentBlockValue; index?: number } = $props();

	const columns = $derived(block.columns ?? []);

	const spans: Record<string, string> = {
		oneThird: 'md:col-span-4',
		half: 'md:col-span-6',
		twoThirds: 'md:col-span-8',
		full: 'md:col-span-12'
	};

	const ve = usePreview();
</script>

{#if columns.length}
	<section class="container my-12" {...ve.edit({ field: 'layout', arrayIndex: index })}>
		<div class="grid grid-cols-1 gap-8 md:grid-cols-12">
			{#each columns as column, i (column._key ?? i)}
				<div class={spans[control(column.size) ?? 'oneThird'] ?? spans.oneThird}>
					<RichText value={column.richText} />
					{#if column.enableLink}
						<div class="mt-4">
							<CMSLink link={column} />
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</section>
{/if}
