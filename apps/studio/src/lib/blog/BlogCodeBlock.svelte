<script lang="ts">
	import type { CustomBlockComponentProps } from '@portabletext/svelte';

	interface Props {
		portableText: CustomBlockComponentProps<{
			_type: 'codeBlock';
			language?: string;
			code?: string;
		}>;
	}

	let { portableText }: Props = $props();
</script>

<div class="my-6 overflow-hidden rounded-lg border border-gray-200">
	{#if portableText.value.language}
		<div class="border-b border-gray-200 bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600">
			{portableText.value.language}
		</div>
	{/if}
	<pre class="overflow-x-auto bg-gray-950 p-4 text-sm leading-relaxed text-green-300"><code
			>{portableText.value.code ?? ''}</code
		></pre>
</div>
