<script lang="ts">
	import { page } from '$app/state';

	let { portableText } = $props();
	const assetRef = portableText?.value?.asset?._ref;
	const imageUrl = $derived(assetRef ? (page.data as any).assetUrls?.[assetRef] : null);
</script>

{#if imageUrl}
	<figure class="my-4">
		<img src={imageUrl} alt="" class="max-w-full rounded" />
	</figure>
{:else if assetRef}
	<div class="my-4 flex h-32 items-center justify-center rounded bg-gray-100 text-sm text-gray-400">
		Image not found
	</div>
{/if}
