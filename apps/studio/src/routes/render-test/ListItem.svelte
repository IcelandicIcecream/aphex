<script lang="ts">
	import type { ListItemComponentProps } from '@portabletext/svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		portableText: ListItemComponentProps;
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<li class="leading-relaxed">{@render children()}</li>
