<script lang="ts">
	import type { MarkComponentProps } from '@portabletext/svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		portableText: MarkComponentProps<{ href?: string; blank?: boolean }>;
		children: Snippet;
	}

	let { portableText, children }: Props = $props();
</script>

<a
	href={portableText.value?.href ?? '#'}
	target={portableText.value?.blank ? '_blank' : undefined}
	rel={portableText.value?.blank ? 'noopener noreferrer' : undefined}
	class="text-gray-900 underline underline-offset-2 hover:text-gray-600"
>
	{@render children()}
</a>
