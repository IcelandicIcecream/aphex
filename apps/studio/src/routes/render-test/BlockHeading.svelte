<script lang="ts">
	import type { BlockComponentProps } from '@portabletext/svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		portableText: BlockComponentProps;
		children: Snippet;
	}

	let { portableText, children }: Props = $props();
	let { style } = $derived(portableText.value);
</script>

{#if style === 'h1'}
	<h1 class="mt-6 mb-2 text-4xl leading-tight font-bold">{@render children()}</h1>
{:else if style === 'h2'}
	<h2 class="mt-5 mb-2 text-3xl leading-snug font-semibold">{@render children()}</h2>
{:else if style === 'h3'}
	<h3 class="mt-4 mb-2 text-2xl leading-snug font-semibold">{@render children()}</h3>
{:else if style === 'h4'}
	<h4 class="mt-4 mb-1 text-xl font-semibold">{@render children()}</h4>
{:else if style === 'h5'}
	<h5 class="mt-3 mb-1 text-lg font-semibold">{@render children()}</h5>
{:else if style === 'h6'}
	<h6 class="mt-3 mb-1 text-sm font-semibold tracking-wide text-gray-500 uppercase">
		{@render children()}
	</h6>
{/if}
