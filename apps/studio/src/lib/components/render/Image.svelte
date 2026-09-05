<script lang="ts">
	import { usePreview } from '@aphexcms/visual-editing';
	// Aliased: this file is itself the Portable Text block named `Image`.
	import { Image as ResponsiveImage } from '@aphexcms/cms-core/image';
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
		<!-- Bleeds to 100vw but caps at 54rem, which is what `sizes` describes. -->
		<ResponsiveImage
			value={portableText.value}
			alt={ve.encode(alt, { blockKey: portableText.value._key })}
			sizes="(max-width: 640px) calc(100vw - 2.5rem), (max-width: 54rem) 100vw, 864px"
		/>
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
	/* :global — the <img> is rendered by <ResponsiveImage>, so it carries no
	   scoping class of this component's. */
	.blog-figure :global(img) {
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
