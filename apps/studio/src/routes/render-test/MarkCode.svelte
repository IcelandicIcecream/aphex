<script lang="ts">
	import type { MarkComponentProps } from '@portabletext/svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		portableText: MarkComponentProps;
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<code class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.85em] text-gray-800"
	>{@render children()}</code
>
