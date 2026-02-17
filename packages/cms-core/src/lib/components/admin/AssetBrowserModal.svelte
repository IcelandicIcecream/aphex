<script lang="ts">
	import * as Dialog from '@aphexcms/ui/shadcn/dialog';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import type { Asset } from '../../types/asset';
	import MediaBrowser from './MediaBrowser.svelte';

	interface Props {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		onSelect?: (asset: Asset) => void;
		onSelectMultiple?: (assets: Asset[]) => void;
		multiSelect?: boolean;
		assetTypeFilter?: 'image' | 'file';
		/** Asset IDs already in use (shown with a tick in the browser) */
		existingAssetIds?: Set<string>;
	}

	let { open = $bindable(), onOpenChange, onSelect, onSelectMultiple, multiSelect = false, assetTypeFilter = 'image', existingAssetIds }: Props = $props();

	function handleSelect(asset: Asset) {
		onSelect?.(asset);
		onOpenChange(false);
	}

	function handleSelectMultiple(assets: Asset[]) {
		onSelectMultiple?.(assets);
		onOpenChange(false);
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content showCloseButton={false} class="flex h-[95vh] max-w-[95vw] sm:max-w-[95vw] flex-col overflow-hidden p-0">
		<Dialog.Header class="sr-only">
			<Dialog.Title>{multiSelect ? 'Select Assets' : 'Select Asset'}</Dialog.Title>
		</Dialog.Header>
		{#if open}
			<div class="flex-1 overflow-hidden">
				{#if multiSelect}
					<MediaBrowser selectable multiSelect onSelectMultiple={handleSelectMultiple} {assetTypeFilter} {existingAssetIds} />
				{:else}
					<MediaBrowser selectable onSelect={handleSelect} {assetTypeFilter} {existingAssetIds} />
				{/if}
			</div>
			<div class="border-border flex justify-end border-t px-4 py-3">
				<Button variant="outline" size="sm" onclick={() => onOpenChange(false)}>Close</Button>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
