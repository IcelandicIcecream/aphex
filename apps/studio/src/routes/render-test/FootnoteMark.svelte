<script lang="ts">
	import type { MarkComponentProps } from '@portabletext/svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		portableText: MarkComponentProps<{ text?: string }>;
		children: Snippet;
	}

	let { portableText, children }: Props = $props();

	let showTooltip = $state(false);
</script>

<span
	class="relative inline"
	onmouseenter={() => (showTooltip = true)}
	onmouseleave={() => (showTooltip = false)}
	role="note"
>
	<span class="cursor-help border-b-2 border-dashed border-amber-400">{@render children()}</span>
	<sup class="ml-0.5 cursor-help text-[10px] font-bold text-amber-600">*</sup>
	{#if showTooltip && portableText.value.text}
		<span
			class="absolute bottom-full left-0 z-10 mb-1 max-w-xs rounded bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
		>
			{portableText.value.text}
		</span>
	{/if}
</span>
