<script lang="ts">
	/**
	 * Archive — a grid of post cards, either queried or hand-picked.
	 *
	 * The block itself does no fetching. `loadArchiveBlocks()` (`$lib/server/archive.ts`)
	 * runs during the page load and attaches the resolved posts to the block as
	 * `_posts`, so the component stays a renderer and the page still
	 * server-renders in one pass with no client-side waterfall.
	 */
	import { usePreview } from '@aphexcms/visual-editing';
	import RichText from '$lib/components/RichText.svelte';
	import CollectionArchive from '$lib/components/CollectionArchive.svelte';
	import type { ArchiveBlockValue } from './types';

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
	let { block, index }: { block: ArchiveBlockValue; index?: number } = $props();

	const posts = $derived(block._posts ?? []);

	const ve = usePreview();
</script>

<section class="container my-12" {...ve.edit({ field: 'layout', arrayIndex: index })}>
	{#if block.introContent}
		<div class="mb-8 max-w-2xl">
			<RichText value={block.introContent} />
		</div>
	{/if}

	<CollectionArchive cards={posts} />
</section>
