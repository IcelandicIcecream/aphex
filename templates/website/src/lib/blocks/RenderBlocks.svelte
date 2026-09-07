<script lang="ts">
	/**
	 * The page builder's renderer: walks a page's `layout` array and renders each
	 * entry with the component for its `_type`.
	 *
	 * `_type` is the discriminator Aphex writes onto every array item, matching the
	 * `type` declared in `schemaTypes/objects/blocks.ts`, and it's a literal on each
	 * member of `LayoutBlock` — so the checks below narrow the union and each
	 * component gets its own typed props with no cast. An unrecognised block —
	 * one authored before its component existed, or removed from the schema —
	 * renders nothing rather than throwing, so a stale document can't take the
	 * whole page down.
	 *
	 * Adding a block is: a new entry in `objects/blocks.ts`, a component, and one
	 * arm below.
	 *
	 * Each block is handed its `index` in the `layout` array. That is what lets a
	 * block make itself click-to-edit in preview — `ve.edit({ field: 'layout',
	 * arrayIndex: index })` reveals that exact row in the studio's form pane, which
	 * is the only way to reach a block whose content is an image rather than text.
	 */
	import CallToActionBlock from './CallToActionBlock.svelte';
	import ContentBlock from './ContentBlock.svelte';
	import MediaBlock from './MediaBlock.svelte';
	import ArchiveBlock from './ArchiveBlock.svelte';
	import FormBlock from './FormBlock.svelte';
	import { control } from '$lib/utils/stega';
	import type { LayoutBlock } from './types';

	let { blocks }: { blocks: LayoutBlock[] | null | undefined } = $props();

	/**
	 * Clean the discriminant, and only the discriminant.
	 *
	 * In preview every string carries click-to-edit markers, so a raw `_type` of
	 * `"cta"` plus invisible characters matches none of the arms below and the
	 * block renders as nothing. Cleaning the whole block would fix that and break
	 * something worse — the markers on its *text* are what make the block editable
	 * by clicking it.
	 *
	 * `control` is identity-typed, so `_type` keeps its literal type and the
	 * discriminated union still narrows below with no cast.
	 */
	function cleanType<T extends LayoutBlock>(block: T): T {
		return { ...block, _type: control(block._type) };
	}

	const items = $derived((Array.isArray(blocks) ? blocks : []).map(cleanType));
</script>

{#each items as block, index (block._key ?? index)}
	{#if block._type === 'cta'}
		<CallToActionBlock {block} {index} />
	{:else if block._type === 'content'}
		<ContentBlock {block} {index} />
	{:else if block._type === 'mediaBlock'}
		<MediaBlock {block} {index} />
	{:else if block._type === 'archive'}
		<ArchiveBlock {block} {index} />
	{:else if block._type === 'formBlock'}
		<FormBlock {block} {index} />
	{/if}
{/each}
