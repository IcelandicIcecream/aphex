<script lang="ts">
	import { PortableText, type PortableTextComponents } from '@portabletext/svelte';
	import Image from './Image.svelte';
	import Callout from './Callout.svelte';
	import CodeBlock from './CodeBlock.svelte';
	import Embed from './Embed.svelte';
	import Toggle from './Toggle.svelte';
	import Divider from './Divider.svelte';
	import Button from './Button.svelte';
	import Gallery from './Gallery.svelte';
	import ContactBlock from './ContactBlock.svelte';
	import CodeStyle from './CodeStyle.svelte';
	import LinkMark from './LinkMark.svelte';
	import { setPortableTextField } from '@aphexcms/visual-editing';
	import type { BlogPost, Page } from '$lib/generated-types';

	// Posts and pages share the Portable Text renderer but not an identical block set
	// (pages add the contactForm block), so accept either content union. `field` is the
	// document field this content belongs to (default 'content') — inline blocks read it
	// for click-to-edit.
	let {
		value,
		field = 'content'
	}: { value: BlogPost['content'] | Page['content']; field?: string } = $props();
	setPortableTextField(() => field);

	const components: Partial<PortableTextComponents> = {
		types: {
			image: Image,
			callout: Callout,
			codeBlock: CodeBlock,
			embed: Embed,
			toggle: Toggle,
			divider: Divider,
			button: Button,
			gallery: Gallery,
			contactForm: ContactBlock
		},
		block: {
			code: CodeStyle
		},
		marks: {
			link: LinkMark
		}
	};
</script>

<div class="prose">
	<PortableText {value} {components} onMissingComponent={false} />
</div>

<style>
	.prose {
		margin-top: 3.25rem;
		font-size: var(--base-size);
		line-height: 1.7;
		color: color-mix(in srgb, var(--ink) 90%, var(--paper));
	}
	.prose :global(p) {
		margin: 0 0 1.5rem;
	}
	.prose :global(h2) {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 1.85rem;
		line-height: 1.18;
		letter-spacing: -0.02em;
		margin: 3rem 0 1rem;
		color: var(--ink);
	}
	.prose :global(h3) {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 1.42rem;
		line-height: 1.25;
		letter-spacing: -0.015em;
		margin: 2.5rem 0 0.85rem;
		color: var(--ink);
	}
	.prose :global(h4) {
		font-weight: 600;
		font-size: 1.12rem;
		margin: 2rem 0 0.6rem;
		color: var(--ink);
	}
	.prose :global(blockquote) {
		margin: 2.25rem 0;
		padding: 0.25rem 0 0.25rem 1.6rem;
		border-left: 3px solid var(--accent);
		font-family: var(--font-display);
		font-style: italic;
		font-size: 1.4rem;
		line-height: 1.45;
		color: var(--ink);
	}
	.prose :global(ul),
	.prose :global(ol) {
		margin: 1.5rem 0;
		padding-left: 1.4rem;
	}
	.prose :global(li) {
		margin-bottom: 0.55rem;
		padding-left: 0.35rem;
	}
	.prose :global(ul) {
		list-style-type: none;
	}
	.prose :global(ul li) {
		position: relative;
	}
	.prose :global(ul li::before) {
		content: '';
		position: absolute;
		left: -1rem;
		top: 0.78em;
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--accent);
	}
	.prose :global(ol) {
		list-style-type: decimal;
	}
	.prose :global(code) {
		background: color-mix(in srgb, var(--accent) 9%, transparent);
		color: var(--accent-ink);
		padding: 0.12em 0.4em;
		border-radius: 5px;
		font-size: 0.86em;
		font-family: ui-monospace, 'SF Mono', 'Menlo', monospace;
	}
	.prose :global(strong) {
		font-weight: 600;
		color: var(--ink);
	}
	.prose :global(em) {
		font-style: italic;
	}
	@media (max-width: 640px) {
		.prose {
			font-size: 1.1rem;
		}
	}
</style>
