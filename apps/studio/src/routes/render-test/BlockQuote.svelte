<script lang="ts">
	import type { BlockComponentProps } from '@portabletext/svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		portableText: BlockComponentProps;
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<blockquote class="my-3 border-l-3 border-gray-300 pl-4 text-gray-500 italic">
	{@render children()}
</blockquote>
