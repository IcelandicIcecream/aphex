<script lang="ts">
	import type { CustomBlockComponentProps } from '@portabletext/svelte';
	import type { CodeBlockBlock } from '$lib/generated-types';

	interface Props {
		portableText: CustomBlockComponentProps<CodeBlockBlock>;
	}

	let { portableText }: Props = $props();
</script>

<div class="my-4 overflow-hidden rounded-md border">
	{#if portableText.value.language}
		<div class="border-b bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
			{portableText.value.language}
		</div>
	{/if}
	<pre class="overflow-auto bg-gray-900 p-4 text-sm text-green-300"><code
			>{portableText.value.code || ''}</code
		></pre>
</div>
