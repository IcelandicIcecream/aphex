<script lang="ts">
	import type { CustomBlockComponentProps } from '@portabletext/svelte';

	interface Props {
		portableText: CustomBlockComponentProps<{ tone?: string; text?: string }>;
	}

	let { portableText }: Props = $props();

	const toneColors: Record<string, string> = {
		info: 'border-blue-300 bg-blue-50 text-blue-900',
		warning: 'border-yellow-300 bg-yellow-50 text-yellow-900',
		error: 'border-red-300 bg-red-50 text-red-900'
	};

	const color = $derived(
		toneColors[portableText.value.tone || ''] || 'border-gray-300 bg-gray-50 text-gray-900'
	);
</script>

<div class="my-4 rounded-md border-l-4 p-4 {color}">
	{#if portableText.value.tone}
		<span class="mb-1 block text-xs font-semibold uppercase">{portableText.value.tone}</span>
	{/if}
	<p class="text-sm">{portableText.value.text || ''}</p>
</div>
