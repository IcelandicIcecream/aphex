<script lang="ts">
	import type { CustomBlockComponentProps } from '@portabletext/svelte';

	interface Props {
		portableText: CustomBlockComponentProps<{ _type: 'callout'; tone?: string; text?: string }>;
	}

	let { portableText }: Props = $props();

	const toneClasses: Record<string, string> = {
		info: 'border-blue-200 bg-blue-50 text-blue-900',
		warning: 'border-amber-200 bg-amber-50 text-amber-900',
		error: 'border-red-200 bg-red-50 text-red-900'
	};

	const tone = $derived(portableText.value.tone ?? 'info');
	const classes = $derived(toneClasses[tone] ?? toneClasses.info);
</script>

<div class="my-6 rounded-lg border p-4 {classes}">
	<p class="text-sm leading-relaxed">{portableText.value.text ?? ''}</p>
</div>
