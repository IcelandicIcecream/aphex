<script lang="ts">
	/** The `link` annotation declared on a post's block marks. */
	import type { MarkComponentProps } from '@portabletext/svelte';
	import type { Snippet } from 'svelte';

	let {
		portableText,
		children
	}: {
		portableText: MarkComponentProps<{ href?: string; blank?: boolean }>;
		children: Snippet;
	} = $props();

	const blank = $derived(portableText.value?.blank === true);
</script>

<a
	href={portableText.value?.href ?? '#'}
	target={blank ? '_blank' : undefined}
	rel={blank ? 'noopener noreferrer' : undefined}
>
	{@render children()}
</a>
