<script lang="ts">
	import { page } from '$app/state';

	let { portableText } = $props();
	const assetRef = $derived(portableText?.value?.asset?._ref);
	const imageUrl = $derived(assetRef ? (page.data as any).assetUrls?.[assetRef] : null);
</script>

{#if imageUrl}
	<figure class="my-8">
		<img src={imageUrl} alt="" class="w-full rounded-lg object-cover" />
	</figure>
{:else if assetRef}
	<div
		class="my-8 flex h-40 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-400"
	>
		Image not found
	</div>
{/if}
