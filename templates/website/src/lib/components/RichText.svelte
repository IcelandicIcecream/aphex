<script lang="ts">
	/**
	 * The Portable Text renderer — used for every rich-text field on the site:
	 * the hero copy, a CTA's pitch, a content column, an archive's intro, and a
	 * post's whole body.
	 *
	 * The `components` map is what connects a schema to markup. Each key is a
	 * type name declared in the field's `of` array (see
	 * `schemaTypes/objects/blocks.ts`); adding a block type there means adding one
	 * entry here and nothing else. Types with no entry are skipped silently by
	 * @portabletext/svelte rather than crashing the page.
	 *
	 * The typographic styles live at the bottom in a `:global` block because the
	 * elements are emitted by PortableText, not by this component, so Svelte's
	 * style scoping doesn't reach them.
	 */
	import { PortableText, type PortableTextComponents, type InputValue } from '@portabletext/svelte';
	import PtImage from './pt/PtImage.svelte';
	import PtLink from './pt/PtLink.svelte';
	import PtBanner from './pt/PtBanner.svelte';
	import PtCode from './pt/PtCode.svelte';
	import PtMedia from './pt/PtMedia.svelte';

	interface Props {
		value: InputValue | null | undefined;
		/** Narrows the measure to ~65 characters. Right for prose, wrong for a hero. */
		narrow?: boolean;
		class?: string;
	}

	let { value, narrow = false, class: className = '' }: Props = $props();

	const components: PortableTextComponents = {
		types: {
			image: PtImage,
			mediaBlock: PtMedia,
			banner: PtBanner,
			code: PtCode
		},
		marks: { link: PtLink }
	};
</script>

{#if value}
	<div class="rich-text {narrow ? 'max-w-[65ch]' : ''} {className}">
		<PortableText {value} {components} />
	</div>
{/if}

<style>
	.rich-text :global(p),
	.rich-text :global(ul),
	.rich-text :global(ol),
	.rich-text :global(blockquote) {
		margin: 0 0 1.15em;
		line-height: 1.7;
	}
	.rich-text :global(ul),
	.rich-text :global(ol) {
		padding-left: 1.4em;
	}
	.rich-text :global(ul) {
		list-style: disc;
	}
	.rich-text :global(ol) {
		list-style: decimal;
	}
	.rich-text :global(h1),
	.rich-text :global(h2),
	.rich-text :global(h3),
	.rich-text :global(h4) {
		margin: 1.6em 0 0.5em;
		font-weight: 600;
		letter-spacing: -0.02em;
		line-height: 1.15;
		text-wrap: balance;
	}
	/* The first heading in a field starts the block — the top margin above would
	   otherwise push it away from whatever it sits under. */
	.rich-text :global(> :first-child) {
		margin-top: 0;
	}
	.rich-text :global(> :last-child) {
		margin-bottom: 0;
	}
	.rich-text :global(h1) {
		font-size: clamp(2rem, 4vw, 3rem);
		letter-spacing: -0.035em;
	}
	.rich-text :global(h2) {
		font-size: clamp(1.5rem, 2.6vw, 2rem);
	}
	.rich-text :global(h3) {
		font-size: 1.25rem;
	}
	.rich-text :global(h4) {
		font-size: 1.05rem;
	}
	.rich-text :global(blockquote) {
		padding-left: 1.1rem;
		border-left: 2px solid var(--border);
		color: var(--muted-foreground);
	}
	.rich-text :global(code) {
		font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
		font-size: 0.9em;
		background: var(--muted);
		padding: 0.15em 0.35em;
		border-radius: 0.25rem;
	}
	/* Tailwind's preflight resets anchors to `text-decoration: inherit`, so the
	   underline has to be asked for explicitly — there'd otherwise be no line for
	   the offset and colour below to affect. */
	.rich-text :global(a) {
		text-decoration-line: underline;
		text-underline-offset: 0.2em;
		text-decoration-thickness: 1px;
		text-decoration-color: color-mix(in srgb, currentColor 40%, transparent);
	}
	.rich-text :global(a:hover) {
		text-decoration-color: currentColor;
	}
	.rich-text :global(hr) {
		margin: 2.5em 0;
		border: 0;
		border-top: 1px solid var(--border);
	}
</style>
