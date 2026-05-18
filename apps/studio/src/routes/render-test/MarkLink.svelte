<script lang="ts">
	import type { MarkComponentProps } from '@portabletext/svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		portableText: MarkComponentProps<{ href?: string }>;
		children: Snippet;
	}

	let { portableText, children }: Props = $props();
</script>

{#if portableText.value.href}
	<a
		href={portableText.value.href}
		class="text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800 hover:decoration-blue-500"
		target={portableText.value.href.startsWith('http') ? '_blank' : undefined}
		rel={portableText.value.href.startsWith('http') ? 'noopener noreferrer' : undefined}
	>
		{@render children()}
	</a>
{:else}
	{@render children()}
{/if}
