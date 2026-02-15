<script lang="ts">
	import * as Dialog from '@aphexcms/ui/shadcn/dialog';
	import type { Asset } from '../../types/asset';
	import MediaBrowser from './MediaBrowser.svelte';

	interface Props {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		onSelect: (asset: Asset) => void;
		assetTypeFilter?: 'image' | 'file';
	}

	let { open = $bindable(), onOpenChange, onSelect, assetTypeFilter = 'image' }: Props = $props();

	function handleSelect(asset: Asset) {
		onSelect(asset);
		onOpenChange(false);
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content class="flex h-[80vh] max-w-5xl flex-col overflow-hidden p-0">
		<Dialog.Header class="sr-only">
			<Dialog.Title>Select Asset</Dialog.Title>
		</Dialog.Header>
		<div class="flex-1 overflow-hidden">
			<MediaBrowser selectable onSelect={handleSelect} {assetTypeFilter} />
		</div>
	</Dialog.Content>
</Dialog.Root>
