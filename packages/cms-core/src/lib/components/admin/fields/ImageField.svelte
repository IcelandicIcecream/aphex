<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Trash2, Upload, Image as ImageIcon, FileImage } from '@lucide/svelte';
	import type { ImageValue } from '../../../types/asset';
	import type { ImageField as ImageFieldType } from '../../../types/schemas';
	import { assets } from '../../../api/assets';
	import { toast } from 'svelte-sonner';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuLabel,
		DropdownMenuGroup
	} from '@aphexcms/ui/shadcn/dropdown-menu';
	import { Ellipsis } from '@lucide/svelte';
	import elementEvents from '../../../utils/element-events';
	import AssetBrowserModal from '../AssetBrowserModal.svelte';

	interface Props {
		field: ImageFieldType;
		value: ImageValue | null;
		validationClasses?: string;
		onUpdate: (value: ImageValue | null) => void;
		schemaType?: string;
		fieldPath?: string;
		readonly?: boolean;
		compact?: boolean; // Compact mode for arrays
		organizationId?: string; // Document's organization ID for asset uploads
	}

	let {
		field,
		value,
		onUpdate,
		validationClasses,
		schemaType,
		fieldPath,
		readonly = false,
		compact = false,
		organizationId
	}: Props = $props();

	// Component state
	let isDragging = $state(false);
	let isUploading = $state(false);
	let uploadError = $state<string | null>(null);
	let fileInputRef: HTMLInputElement;
	let showAssetBrowser = $state(false);

	// Upload file to server
	async function uploadFile(file: File): Promise<ImageValue | null> {
		isUploading = true;
		uploadError = null;

		try {
			const formData = new FormData();
			formData.append('file', file);

			// Add document's organization ID so asset belongs to document's org
			if (organizationId) formData.append('organizationId', organizationId);

			// Add field metadata for privacy checking
			if (schemaType) formData.append('schemaType', schemaType);
			if (fieldPath) formData.append('fieldPath', fieldPath);

			const result = await assets.upload(formData);

			if (!result.success) {
				throw new Error(result.error || 'Upload failed');
			}

			// Extract asset from response
			const asset = result.data;

			// Return Sanity-style image value
			return {
				_type: 'image',
				asset: {
					_type: 'reference',
					_ref: asset!.id
				}
			};
		} catch (error) {
			uploadError = error instanceof Error ? error.message : 'Upload failed';
			return null;
		} finally {
			isUploading = false;
		}
	}

	// Handle file selection
	async function handleFileSelect(files: FileList | null) {
		if (readonly || !files || files.length === 0) return;

		const file = files[0]!;

		const imageValue = await uploadFile(file);
		if (imageValue) {
			onUpdate(imageValue);
		}
	}

	// Drag and drop handlers
	function handleDragOver(event: DragEvent) {
		if (readonly) return;
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(event: DragEvent) {
		if (readonly) return;
		event.preventDefault();
		isDragging = false;
	}

	function handleDrop(event: DragEvent) {
		if (readonly) return;
		event.preventDefault();
		isDragging = false;
		handleFileSelect(event.dataTransfer?.files || null);
	}

	// File input handlers
	function handleFileInputChange(event: Event) {
		if (readonly) return;
		const target = event.target as HTMLInputElement;
		handleFileSelect(target.files);
	}

	function openFileDialog() {
		if (readonly) return;
		fileInputRef?.click();
	}

	// Remove image
	function removeImage() {
		if (readonly) return;
		onUpdate(null);
		uploadError = null;
	}

	// Asset data state
	let assetData = $state<any>(null);
	let loadingAsset = $state(false);
	let lastAssetId = $state<string | null>(null);

	// Fetch asset details when asset reference changes
	$effect(() => {
		async function loadAsset() {
			const assetId = value?.asset?._ref || null;

			// Only fetch if asset ID has actually changed
			if (assetId !== lastAssetId) {
				lastAssetId = assetId;

				if (assetId) {
					loadingAsset = true;
					try {
						const result = await assets.getById(assetId);
						if (result.success) {
							assetData = result.data;
						} else {
							toast.error('Failed to fetch asset details');
							assetData = null;
						}
					} catch (error) {
						toast.error('Failed to load image asset');
						assetData = null;
					} finally {
						loadingAsset = false;
					}
				} else {
					assetData = null;
					loadingAsset = false;
				}
			}
		}
		loadAsset();
	});

	// Get asset URL for preview
	const previewUrl = $derived(assetData?.url || null);

	// Get display name for the image
	const displayName = $derived(
		assetData?.originalFilename || assetData?.filename || value?.asset?._ref || 'Image'
	);
</script>

<!-- Hidden file input -->
<input
	bind:this={fileInputRef}
	type="file"
	accept={field.accept || 'image/*'}
	style="display: none"
	onchange={handleFileInputChange}
/>

{#if compact}
	<!-- Compact mode for arrays -->
	{#if value && value.asset}
		<!-- Compact image row with thumbnail -->
		<div class="border-border flex items-center gap-3 rounded-md border p-2 {validationClasses}">
			<!-- Thumbnail -->
			<div
				class="bg-muted flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded"
			>
				{#if loadingAsset}
					<div class="border-primary h-4 w-4 animate-spin rounded-full border-b-2"></div>
				{:else if previewUrl}
					<img
						src={previewUrl}
						alt={assetData?.alt || displayName}
						class="h-full w-full object-cover"
						loading="lazy"
					/>
				{:else}
					<ImageIcon size={20} class="text-muted-foreground" />
				{/if}
			</div>

			<!-- File name -->
			<div class="flex-1 overflow-hidden">
				<p class="truncate text-sm font-medium">{displayName}</p>
				{#if assetData?.size}
					<p class="text-muted-foreground text-xs">
						{(assetData.size / 1024).toFixed(1)} KB
					</p>
				{/if}
			</div>

			<!-- Options menu -->
			{#if !readonly}
				<DropdownMenu>
					<DropdownMenuTrigger>
						<Button variant="ghost" size="sm" class="h-8 w-8 p-0">
							<Ellipsis size={16} />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuGroup>
							<DropdownMenuLabel>
								<Button
									variant="ghost"
									size="sm"
									onclick={openFileDialog}
									disabled={isUploading}
									class="w-full justify-start"
								>
									<Upload size={16} class="mr-2" />
									Replace
								</Button>
							</DropdownMenuLabel>
							<DropdownMenuLabel>
								<Button
									variant="ghost"
									size="sm"
									onclick={removeImage}
									disabled={isUploading}
									class="text-destructive hover:text-destructive w-full justify-start"
								>
									<Trash2 size={16} class="mr-2" />
									Remove
								</Button>
							</DropdownMenuLabel>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			{/if}
		</div>
	{:else}
		<!-- Compact upload button -->
		<Button
			variant="outline"
			class="w-full justify-start"
			onclick={openFileDialog}
			disabled={isUploading || readonly}
			type="button"
		>
			{#if isUploading}
				<div class="border-primary mr-2 h-4 w-4 animate-spin rounded-full border-b-2"></div>
				Uploading...
			{:else}
				<Upload size={16} class="mr-2" />
				Upload Image
			{/if}
		</Button>
	{/if}
{:else}
	<!-- Full mode (original) -->
	{#if value && value.asset}
		<!-- Image preview with controls -->
		<div class="border-border overflow-hidden rounded-md border {validationClasses}">
			<div class="group relative">
				<!-- Image preview (Sanity-style aspect ratio ~2.75:1) -->
				<div class="bg-muted flex items-center justify-center" style="aspect-ratio: 2.75 / 1;">
					{#if loadingAsset}
						<div class="text-muted-foreground flex flex-col items-center gap-2">
							<div class="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
							<span class="text-sm">Loading image...</span>
						</div>
					{:else if previewUrl}
						<img
							src={previewUrl}
							alt={assetData?.alt || 'Uploaded image'}
							class="h-full w-full object-contain"
							loading="lazy"
						/>
					{:else}
						<div class="text-muted-foreground flex flex-col items-center gap-2">
							<ImageIcon size={32} />
							<span class="text-sm">Image: {value.asset._ref}</span>
							<span class="text-xs">Failed to load preview</span>
						</div>
					{/if}
				</div>

				<!-- Overlay controls (hidden for read-only) -->
				{#if !readonly}
					<div class="absolute inset-2 flex items-start justify-end gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger><Ellipsis /></DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuGroup>
									<DropdownMenuLabel
										><Button
											variant="secondary"
											size="sm"
											onclick={openFileDialog}
											disabled={isUploading}
										>
											<Upload size={16} class="mr-1" />
											Replace
										</Button></DropdownMenuLabel
									>
									<DropdownMenuLabel
										><Button
											variant="destructive"
											size="sm"
											onclick={removeImage}
											disabled={isUploading}
										>
											<Trash2 size={16} class="mr-1" />
											Remove
										</Button></DropdownMenuLabel
									>
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				{/if}
			</div>

			<!-- Additional image controls/metadata could go here -->
			{#if field.fields}
				<div class="border-border space-y-2 border-t p-3">
					<!-- Custom fields like caption, alt text, etc. would be rendered here -->
					<p class="text-muted-foreground text-xs">Custom fields coming soon...</p>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Sanity-style upload bar -->
		<div
			class="border-border flex h-10 items-center overflow-hidden rounded-md border transition-colors {validationClasses} {readonly ? '' : isDragging ? 'bg-primary/5' : ''}"
			use:elementEvents={{
				events: [
					{ name: 'dragover', handler: handleDragOver },
					{ name: 'drop', handler: handleDrop },
					{ name: 'dragleave', handler: handleDragLeave }
				]
			}}
		>
			<!-- Drop zone text -->
			<div class="flex flex-1 items-center gap-2 px-3">
				{#if isUploading}
					<div class="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
					<span class="text-muted-foreground text-sm">Uploading...</span>
				{:else}
					<FileImage size={16} class="text-muted-foreground" />
					<span class="text-muted-foreground text-sm">
						{readonly ? 'No image' : isDragging ? 'Drop image here' : 'Drag or paste image here'}
					</span>
				{/if}
			</div>

			<!-- Buttons -->
			<div class="flex items-center gap-1 pr-2">
				<button
					onclick={openFileDialog}
					disabled={isUploading || readonly}
					type="button"
					class="text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 text-sm transition-colors disabled:opacity-50"
				>
					<Upload size={14} />
					Upload
				</button>
				<button
					disabled={isUploading || readonly}
					type="button"
					onclick={() => { showAssetBrowser = true; }}
					class="text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 text-sm transition-colors disabled:opacity-50"
				>
					<ImageIcon size={14} />
					Select
				</button>
			</div>
		</div>
	{/if}
{/if}

<!-- Error display -->
{#if uploadError}
	<p class="text-destructive mt-2 text-sm">{uploadError}</p>
{/if}

<!-- Asset Browser Modal -->
<AssetBrowserModal
	bind:open={showAssetBrowser}
	onOpenChange={(v) => (showAssetBrowser = v)}
	assetTypeFilter="image"
	onSelect={(asset) => {
		const imageValue: ImageValue = {
			_type: 'image',
			asset: {
				_type: 'reference',
				_ref: asset.id
			}
		};
		onUpdate(imageValue);
	}}
/>
