<script lang="ts">
	import { usePreview } from '@aphexcms/visual-editing';
	import type { CustomBlockComponentProps } from '@portabletext/svelte';
	import type { PortableTextImageBlock } from '$lib/generated-types';

	interface Props {
		portableText: CustomBlockComponentProps<PortableTextImageBlock>;
	}

	let { portableText }: Props = $props();
	const ve = usePreview();
	const assetRef = $derived(portableText.value.asset?._ref);
	const { src, alt } = $derived(ve.image(portableText.value));
</script>

{#if src}
	<figure class="blog-figure">
		<!-- `ve.encode` stamps click-to-edit only in preview; `field` comes from the PT context. -->
		<img {src} alt={ve.encode(alt, { blockKey: portableText.value._key })} loading="lazy" />
	</figure>
{:else if assetRef}
	<div class="blog-figure blog-figure--missing">Image not found</div>
{/if}

<style>
	.blog-figure {
		margin: 2.75rem 0;
		width: var(--bleed-width, 100vw);
		max-width: 54rem;
		margin-left: 50%;
		transform: translateX(-50%);
		border-radius: 12px;
		overflow: hidden;
		background: var(--rule-soft);
	}
	.blog-figure img {
		width: 100%;
		display: block;
		object-fit: cover;
	}
	.blog-figure--missing {
		display: grid;
		place-items: center;
		height: 12rem;
		color: var(--ink-faint);
		font-size: 0.9rem;
	}
	@media (max-width: 640px) {
		.blog-figure {
			width: 100%;
			margin-left: 0;
			transform: none;
			border-radius: 9px;
		}
	}
</style>
