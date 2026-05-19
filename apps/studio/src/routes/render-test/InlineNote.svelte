<script lang="ts">
	import type { CustomBlockComponentProps } from '@portabletext/svelte';
	import type { InlineNoteInline } from '$lib/generated-types';

	interface Props {
		portableText: CustomBlockComponentProps<InlineNoteInline>;
	}

	let { portableText }: Props = $props();

	let showTooltip = $state(false);
</script>

<span
	class="relative inline"
	onmouseenter={() => (showTooltip = true)}
	onmouseleave={() => (showTooltip = false)}
	role="note"
>
	<span
		class="cursor-help rounded border border-dashed border-purple-400 bg-purple-50 px-1 py-0.5 text-sm text-purple-800"
		>note</span
	>
	{#if showTooltip && portableText.value.text}
		<span
			class="absolute bottom-full left-0 z-10 mb-1 max-w-xs rounded bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
		>
			{portableText.value.text}
		</span>
	{/if}
</span>
