<script lang="ts">
	import type { BlockPreviewProps } from '@aphexcms/cms-core/client/ui';
	import { Pencil, Trash2 } from '@lucide/svelte';
	import { embedSrc, embedRatio } from '../embed';

	// Inline editor preview for the `embed` block: renders the real iframe as you write
	// (the Ghost/Sanity "what you see is what you get" behaviour) instead of a grey card.
	// Registered app-side via <AdminApp blockPreviews={{ embed: EmbedPreview }} />.
	let { data, selected = false, onEdit, onDelete }: BlockPreviewProps = $props();

	const code = $derived(typeof data.embedCode === 'string' ? data.embedCode : '');
	const caption = $derived(typeof data.caption === 'string' ? data.caption : '');
	const src = $derived(embedSrc(code));
	const ratio = $derived(embedRatio(code));
</script>

<div
	class="group relative my-2 rounded-md border"
	class:ring-2={selected}
	class:ring-primary={selected}
>
	{#if src}
		<!-- pointer-events-none: clicks belong to the editor (select/drag), not the iframe. -->
		<div class="pointer-events-none overflow-hidden rounded-md" style:aspect-ratio={ratio}>
			<iframe
				{src}
				title={caption || 'Embedded content'}
				loading="lazy"
				class="h-full w-full border-0"
			></iframe>
		</div>
		{#if caption}
			<p class="text-muted-foreground truncate px-3 py-2 text-xs">{caption}</p>
		{/if}
	{:else}
		<div class="text-muted-foreground p-6 text-center text-sm">
			Embed — paste an &lt;iframe&gt; snippet to preview it here.
		</div>
	{/if}

	<!-- Editing affordances: the preview replaces the generic card, so it owns these. -->
	<div
		class="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
	>
		<button
			type="button"
			onclick={onEdit}
			title="Edit"
			aria-label="Edit embed"
			class="bg-background/90 hover:bg-background rounded border p-1.5 shadow-sm"
		>
			<Pencil class="h-3.5 w-3.5" />
		</button>
		<button
			type="button"
			onclick={onDelete}
			title="Remove"
			aria-label="Remove embed"
			class="bg-background/90 hover:bg-background text-destructive rounded border p-1.5 shadow-sm"
		>
			<Trash2 class="h-3.5 w-3.5" />
		</button>
	</div>
</div>
