<script lang="ts">
	import type { BlockComponentProps } from '@portabletext/svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		portableText: BlockComponentProps;
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<p class="my-2 leading-relaxed">{@render children()}</p>
