<script lang="ts">
	import * as Dialog from '@aphexcms/ui/shadcn/dialog';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import type { Asset } from '../../types/asset';
	import MediaBrowser from './MediaBrowser.svelte';
	import type { AcceptedFileTypes } from '../../utils/file-accept';
	import { isAcceptedFileType } from '../../utils/file-accept';
	import { toast } from 'svelte-sonner';

	interface Props {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		onSelect?: (asset: Asset) => void;
		/** Complete set of selected asset IDs across all pages (see MediaBrowser). */
		onSelectMultiple?: (assetIds: string[]) => void;
		multiSelect?: boolean;
		assetTypeFilter?: 'image' | 'file';
		accept?: AcceptedFileTypes;
		/** Asset IDs already in use (shown with a tick in the browser) */
		existingAssetIds?: Set<string>;
		/**
		 * The field that opened this picker. Passed through so an upload made from
		 * inside a private field inherits that field's privacy — see MediaBrowser.
		 */
		schemaType?: string;
		fieldPath?: string;
	}

	let {
		open = $bindable(),
		onOpenChange,
		onSelect,
		onSelectMultiple,
		multiSelect = false,
		assetTypeFilter = 'image',
		accept,
		existingAssetIds,
		schemaType,
		fieldPath
	}: Props = $props();

	function handleSelect(asset: Asset) {
		if (!isAcceptedFileType(asset.originalFilename, asset.mimeType, accept)) {
			toast.error(`This field does not accept ${asset.mimeType}`);
			return;
		}
		onSelect?.(asset);
		onOpenChange(false);
	}

	function handleSelectMultiple(assetIds: string[]) {
		onSelectMultiple?.(assetIds);
		onOpenChange(false);
	}
</script>

<Dialog.Root bind:open {onOpenChange}>
	<Dialog.Content
		showCloseButton={false}
		class="!z-[9999] flex h-[95vh] max-w-[95vw] flex-col overflow-hidden p-0 sm:max-w-[95vw]"
		overlayClass="!z-[9998]"
	>
		<Dialog.Header class="sr-only">
			<Dialog.Title>{multiSelect ? 'Select Assets' : 'Select Asset'}</Dialog.Title>
		</Dialog.Header>
		{#if open}
			<div class="flex-1 overflow-hidden">
				{#if multiSelect}
					<MediaBrowser
						selectable
						multiSelect
						onSelectMultiple={handleSelectMultiple}
						{assetTypeFilter}
						{accept}
						{existingAssetIds}
						{schemaType}
						{fieldPath}
					/>
				{:else}
					<MediaBrowser
						selectable
						onSelect={handleSelect}
						{assetTypeFilter}
						{accept}
						{existingAssetIds}
						{schemaType}
						{fieldPath}
					/>
				{/if}
			</div>
			<div class="border-border flex justify-end border-t px-4 py-3">
				<Button variant="outline" size="sm" onclick={() => onOpenChange(false)}>Close</Button>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
