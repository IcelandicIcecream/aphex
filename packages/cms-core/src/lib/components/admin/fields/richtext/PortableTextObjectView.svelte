<script lang="ts">
	import { Pencil, Trash2 } from '@lucide/svelte';
	import {
		resolvePreviewMedia,
		resolvePreviewTitle,
		resolvePreviewSubtitle
	} from '../../../../utils/preview';
	import { assets } from '../../../../api/assets';
	import AssetImage from '../../AssetImage.svelte';
	import type { BlockPreviewProps } from '../../../../admin/block-previews.svelte';

	// Shares the block-preview contract with app-registered previews, so the node view
	// can mount either through one type. `nodeKey` is passed for parity but unused here.
	// eslint-disable-next-line svelte/no-unused-props
	let { type, data, schema, selected = false, onEdit, onDelete }: BlockPreviewProps = $props();

	// Honour the block type's `preview` config (the same resolver array rows and
	// document lists use), so a schema can say what its card reads. `resolvePreviewTitle`
	// already falls back to conventional field names (title/heading/name/label) → the
	// schema's title → the type name.
	const title = $derived(resolvePreviewTitle(data, schema, type));

	const subtitle = $derived.by(() => {
		const configured = resolvePreviewSubtitle(data, schema);
		if (configured) return configured;
		// No `preview.select.subtitle` — fall back to scraping the first couple of
		// non-empty string fields so an unconfigured block still says something.
		const parts: string[] = [];
		for (const [key, val] of Object.entries(data)) {
			if (key.startsWith('_') || key === 'title' || key === 'name') continue;
			if (typeof val === 'string' && val.length > 0) {
				parts.push(val.length > 40 ? val.slice(0, 40) + '...' : val);
				if (parts.length >= 2) break;
			}
		}
		return parts.join(' - ');
	});

	// A block with a picture (a photo, a gallery's first image) shows it, so the post
	// reads like the page it makes rather than a list of type names.
	const mediaRef = $derived(resolvePreviewMedia(data, schema));
	const media = $derived(mediaRef ? assets.getById(mediaRef) : null);
</script>

<div
	class="border-rule bg-muted/20 hover:bg-muted/40 group my-2 flex items-center gap-2 rounded-md border px-3 py-2 transition-colors"
	class:ring-primary={selected}
	class:ring-2={selected}
>
	<button type="button" class="flex min-w-0 flex-1 items-center gap-3 text-left" onclick={onEdit}>
		{#if media}
			{#await media}
				<div class="bg-muted h-16 w-24 shrink-0 animate-pulse rounded"></div>
			{:then result}
				{#if result.success && result.data?.url}
					<AssetImage
						src={result.data.url}
						mimeType={result.data.mimeType}
						alt=""
						class="bg-muted h-16 w-24 shrink-0 rounded object-cover"
					/>
				{:else}
					<div class="bg-muted h-16 w-24 shrink-0 rounded"></div>
				{/if}
			{:catch}
				<div class="bg-muted h-16 w-24 shrink-0 rounded"></div>
			{/await}
		{:else}
			<div
				class="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-medium uppercase"
			>
				{type.slice(0, 2)}
			</div>
		{/if}
		<div class="min-w-0 flex-1">
			<div class="text-foreground text-sm font-medium capitalize">{title}</div>
			{#if subtitle}
				<div class="text-muted-foreground truncate text-xs">{subtitle}</div>
			{/if}
		</div>
	</button>

	<div class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
		<button
			type="button"
			class="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
			onclick={onEdit}
			title="Edit"
		>
			<Pencil class="h-3.5 w-3.5" />
		</button>
		<button
			type="button"
			class="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
			onclick={onDelete}
			title="Remove"
		>
			<Trash2 class="h-3.5 w-3.5" />
		</button>
	</div>
</div>
