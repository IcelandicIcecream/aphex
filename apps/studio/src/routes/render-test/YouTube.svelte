<script lang="ts">
	import type { CustomBlockComponentProps } from '@portabletext/svelte';

	interface Props {
		portableText: CustomBlockComponentProps<{ url?: string; caption?: string }>;
	}

	let { portableText }: Props = $props();

	const videoId = $derived(() => {
		const url = portableText.value.url || '';
		const match = url.match(
			/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/
		);
		return match ? match[1] : null;
	});
</script>

<div class="my-4 overflow-hidden rounded-lg border">
	{#if videoId()}
		<div style="position: relative; padding-bottom: 56.25%; height: 0;">
			<iframe
				src="https://www.youtube.com/embed/{videoId()}"
				title={portableText.value.caption || 'YouTube video'}
				style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
				frameborder="0"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowfullscreen
			></iframe>
		</div>
	{:else}
		<div class="flex items-center justify-center bg-gray-100 p-8 text-sm text-gray-500">
			Invalid YouTube URL
		</div>
	{/if}
	{#if portableText.value.caption}
		<p class="border-t bg-gray-50 px-4 py-2 text-center text-sm text-gray-600">
			{portableText.value.caption}
		</p>
	{/if}
</div>
