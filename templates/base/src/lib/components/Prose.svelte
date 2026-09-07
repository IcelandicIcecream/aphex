<script lang="ts">
	/**
	 * Minimal Portable Text renderer.
	 *
	 * Handles exactly what the `page` schema can produce: text blocks, the `link`
	 * annotation, and block-level images. Add a component here for each new type
	 * you put in the field's `of` array. The Website template's `RichText`
	 * component is the fuller worked example.
	 */
	import { PortableText, type PortableTextComponents } from '@portabletext/svelte';
	import PtImage from './PtImage.svelte';
	import PtLink from './PtLink.svelte';
	import type { Page } from '$lib/generated-types';

	// Typed from the schema via `pnpm generate:types` rather than widened to
	// `unknown` — add a block type to the `content` field and this prop follows.
	let { value }: { value: Page['content'] } = $props();

	const components: PortableTextComponents = {
		types: { image: PtImage },
		marks: { link: PtLink }
	};
</script>

<div class="prose">
	<PortableText {value} {components} />
</div>

<style>
	.prose :global(p),
	.prose :global(ul),
	.prose :global(ol),
	.prose :global(blockquote) {
		margin: 0 0 1.15em;
		line-height: 1.7;
	}
	.prose :global(h2),
	.prose :global(h3),
	.prose :global(h4) {
		margin: 2em 0 0.6em;
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.25;
	}
	.prose :global(h2) {
		font-size: 1.5rem;
	}
	.prose :global(h3) {
		font-size: 1.2rem;
	}
	.prose :global(blockquote) {
		padding-left: 1.1rem;
		border-left: 2px solid var(--accent);
		color: var(--smoke);
	}
	.prose :global(code) {
		font-family: var(--mono);
		font-size: 0.9em;
	}
	/* Underline carries the accent; the word itself stays ink. Tailwind preflight
	   resets anchors to `text-decoration: inherit`, so the line must be requested
	   explicitly or there is nothing for the colour below to paint. */
	.prose :global(a) {
		color: var(--ink);
		text-decoration-line: underline;
		text-decoration-color: color-mix(in srgb, var(--ink) 25%, transparent);
		text-underline-offset: 0.2em;
		text-decoration-thickness: 1.5px;
		transition: text-decoration-color 120ms ease;
	}
	.prose :global(a:hover) {
		text-decoration-color: var(--accent);
	}
	.prose :global(img) {
		max-width: 100%;
		height: auto;
		display: block;
		margin: 2em 0;
	}
</style>
