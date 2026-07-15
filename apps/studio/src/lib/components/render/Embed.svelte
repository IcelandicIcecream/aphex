<script lang="ts">
	import type { CustomBlockComponentProps } from '@portabletext/svelte';
	import { stegaClean } from '@aphexcms/visual-editing';
	import { embedSrc, embedRatio } from '../embed';

	interface Props {
		portableText: CustomBlockComponentProps<{
			_type: 'embed';
			embedCode?: string;
			caption?: string;
		}>;
	}

	let { portableText }: Props = $props();

	// The pasted snippet carries invisible stega markers in preview — clean before parsing
	// or the regex/URL parse sees corrupted text.
	const code = $derived(stegaClean(portableText.value.embedCode ?? '').trim());

	// Parsing lives in ./embed so the editor's inline preview shares it exactly.
	const src = $derived(embedSrc(code));
	const ratio = $derived(embedRatio(code));

	const caption = $derived(portableText.value.caption ?? '');
</script>

{#if src}
	<figure class="embed">
		<div class="embed__frame" style:aspect-ratio={ratio}>
			<iframe
				{src}
				title={caption || 'Embedded content'}
				loading="lazy"
				allowfullscreen
				referrerpolicy="strict-origin-when-cross-origin"
			></iframe>
		</div>
		{#if caption}<figcaption>{caption}</figcaption>{/if}
	</figure>
{:else}
	<p class="embed__empty">Embed: paste an &lt;iframe&gt; snippet or a direct embed URL.</p>
{/if}

<style>
	.embed {
		margin: 2.5rem 0;
	}
	.embed__frame {
		position: relative;
		width: 100%;
		overflow: hidden;
		border-radius: 12px;
		border: 1px solid var(--rule);
		background: var(--paper-raised);
	}
	.embed__frame :global(iframe),
	.embed__frame iframe {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
		display: block;
	}
	figcaption {
		margin-top: 0.7rem;
		font-size: 0.85rem;
		color: color-mix(in srgb, var(--ink) 60%, var(--paper));
		text-align: center;
	}
	.embed__empty {
		margin: 2.5rem 0;
		padding: 1.2rem;
		border: 1px dashed var(--rule);
		border-radius: 12px;
		text-align: center;
		font-size: 0.9rem;
		color: color-mix(in srgb, var(--ink) 55%, var(--paper));
	}
</style>
