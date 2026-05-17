<script lang="ts">
	import type { MarkComponentProps } from '@portabletext/svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		portableText: MarkComponentProps<{ reference?: { _ref?: string; _type?: string } }>;
		children: Snippet;
	}

	let { portableText, children }: Props = $props();

	const ref = $derived(portableText.value.reference?._ref);
</script>

{#if ref}
	<a
		href="/documents/{ref}"
		class="text-indigo-600 underline decoration-indigo-300 decoration-2 underline-offset-2 transition-colors hover:text-indigo-800 hover:decoration-indigo-500"
		title="Internal link: {ref}"
	>
		{@render children()}
	</a>
{:else}
	<span class="text-red-500 line-through" title="Broken internal link">
		{@render children()}
	</span>
{/if}
