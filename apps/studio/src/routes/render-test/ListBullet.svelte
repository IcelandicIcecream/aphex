<script lang="ts">
	import type { ListComponentProps } from '@portabletext/svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		portableText: ListComponentProps;
		children: Snippet;
	}

	let { portableText, children }: Props = $props();
	let { listItem } = $derived(portableText.value);
</script>

{#if listItem === 'number'}
	<ol class="my-2 list-decimal space-y-1 pl-6">{@render children()}</ol>
{:else}
	<ul class="my-2 list-disc space-y-1 pl-6">{@render children()}</ul>
{/if}
