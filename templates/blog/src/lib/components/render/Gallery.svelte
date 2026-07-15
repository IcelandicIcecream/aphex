<script lang="ts">
	import { usePreview } from '@aphexcms/visual-editing';
	import type { CustomBlockComponentProps } from '@portabletext/svelte';

	// Each item is an image value ({ asset: { _ref }, alt? }) — the same shape Image
	// resolves, so we reuse `ve.image()` per item.
	type GalleryImage = { _key?: string; asset?: { _ref?: string }; alt?: string };

	interface Props {
		portableText: CustomBlockComponentProps<{
			_type: 'gallery';
			images?: GalleryImage[];
			caption?: string;
		}>;
	}

	let { portableText }: Props = $props();
	const ve = usePreview();

	// Resolve each image, dropping any that don't resolve to a src.
	const items = $derived(
		(portableText.value.images ?? [])
			.map((img, i) => ({ key: img._key ?? String(i), ...ve.image(img) }))
			.filter((img) => Boolean(img.src))
	);

	const caption = $derived(portableText.value.caption ?? '');
	// 1 image → full width; 2 → halves; 3+ → a responsive grid that stays balanced.
	const columns = $derived(Math.min(items.length, 3));
</script>

{#if items.length > 0}
	<figure class="gallery">
		<div class="gallery__grid" style:--cols={columns}>
			{#each items as img (img.key)}
				<img src={img.src} alt={img.alt ?? ''} loading="lazy" />
			{/each}
		</div>
		{#if caption}<figcaption>{caption}</figcaption>{/if}
	</figure>
{/if}

<style>
	.gallery {
		margin: 2.75rem 0;
		width: var(--bleed-width, 100vw);
		max-width: 54rem;
		margin-left: 50%;
		transform: translateX(-50%);
	}
	.gallery__grid {
		display: grid;
		grid-template-columns: repeat(var(--cols, 3), 1fr);
		gap: 0.6rem;
	}
	.gallery__grid img {
		width: 100%;
		height: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
		display: block;
		border-radius: 8px;
		background: var(--rule-soft);
	}
	figcaption {
		margin-top: 0.7rem;
		font-size: 0.85rem;
		color: color-mix(in srgb, var(--ink) 60%, var(--paper));
		text-align: center;
	}
	@media (max-width: 640px) {
		.gallery {
			width: 100%;
			margin-left: 0;
			transform: none;
		}
		.gallery__grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
