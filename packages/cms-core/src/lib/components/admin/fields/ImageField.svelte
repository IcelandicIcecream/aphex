<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Upload, Image as ImageIcon, FileImage, Download, Copy, CircleX } from '@lucide/svelte';
	import type { ImageValue } from '../../../types/asset';
	import type { ImageField as ImageFieldType } from '../../../types/schemas';
	import { assets } from '../../../api/assets';
	import { toast } from 'svelte-sonner';
	import {
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuGroup
	} from '@aphexcms/ui/shadcn/dropdown-menu';
	import { Ellipsis } from '@lucide/svelte';
	import elementEvents from '../../../utils/element-events';
	import { copyUrlToClipboard, downloadFile } from '../../../utils/asset-actions';
	import AssetBrowserModal from '../AssetBrowserModal.svelte';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { usePermissions } from '../../../permissions-context.svelte';

	interface Props {
		field: ImageFieldType;
		value: ImageValue | null;
		validationClasses?: string;
		onUpdate: (value: ImageValue | null) => void;
		schemaType?: string;
		fieldPath?: string;
		readonly?: boolean;
		compact?: boolean; // Compact mode for arrays
		arrayItem?: boolean; // Minimal row mode for array DnD — just thumbnail + name, no controls
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
		arrayItem = false,
		organizationId
	}: Props = $props();

	// Treat the field as read-only when the explicit prop is set OR the user
	// lacks asset.upload — both paths land the user at the same UX.
	const perms = usePermissions();
	const isReadOnly = $derived(readonly || !perms.can('asset.upload'));

	// Component state
	let isDragging = $state(false);
	// Drag-counter to defeat the dragleave/dragenter flicker: every child
	// element the cursor crosses fires `dragleave` on the parent immediately
	// followed by `dragenter`, so a naive `dragover → true / dragleave → false`
	// flickers `isDragging` rapidly. Counting enters/leaves and only resetting
	// at zero gives stable highlight state.
	let dragDepth = 0;
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
		if (isReadOnly || !files || files.length === 0) return;

		const file = files[0]!;

		const imageValue = await uploadFile(file);
		if (imageValue) {
			onUpdate(imageValue);
		}
	}

	// Drag and drop handlers
	function handleDragEnter(event: DragEvent) {
		if (isReadOnly) return;
		event.preventDefault();
		dragDepth++;
		isDragging = true;
	}

	function handleDragOver(event: DragEvent) {
		if (isReadOnly) return;
		event.preventDefault(); // required to allow `drop` to fire
	}

	function handleDragLeave(event: DragEvent) {
		if (isReadOnly) return;
		event.preventDefault();
		dragDepth = Math.max(0, dragDepth - 1);
		if (dragDepth === 0) isDragging = false;
	}

	function handleDrop(event: DragEvent) {
		if (isReadOnly) return;
		event.preventDefault();
		dragDepth = 0;
		isDragging = false;
		handleFileSelect(event.dataTransfer?.files || null);
	}

	// File input handlers
	function handleFileInputChange(event: Event) {
		if (isReadOnly) return;
		const target = event.target as HTMLInputElement;
		handleFileSelect(target.files);
	}

	function openFileDialog() {
		if (isReadOnly) return;
		fileInputRef?.click();
	}

	// Remove image
	function removeImage() {
		if (isReadOnly) return;
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
					} catch {
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

	// Two layers of alt text:
	//  • Default — stored on the ASSET, shared across every placement. Set it once and
	//    it applies everywhere the image is used.
	//  • Override — stored on THIS image value, for when one spot needs a different
	//    description. Render precedence is `value.alt || asset.alt`.
	// The override is also what carries visual-editing stega.
	let assetAltText = $state('');
	let assetAltTimer: ReturnType<typeof setTimeout> | null = null;

	// Sync the default from the loaded asset record.
	$effect(() => {
		assetAltText = assetData?.alt || '';
	});

	function updateAssetAlt(newAlt: string) {
		assetAltText = newAlt;
		// Debounce the asset-update API call.
		if (assetAltTimer) clearTimeout(assetAltTimer);
		assetAltTimer = setTimeout(async () => {
			const assetId = value?.asset?._ref;
			if (!assetId) return;
			try {
				await assets.update(assetId, { alt: newAlt || undefined });
			} catch {
				toast.error('Failed to save alt text');
			}
		}, 800);
	}

	function updateOverrideAlt(newAlt: string) {
		if (!value) return;
		onUpdate({ ...value, alt: newAlt || undefined });
	}

	// Whether to reveal the per-placement override input.
	let showOverride = $state(false);
	$effect(() => {
		if (value?.alt) showOverride = true;
	});

	// Download image
	function downloadImage() {
		if (previewUrl) {
			downloadFile(previewUrl, displayName);
		}
	}

	// Copy URL to clipboard
	async function copyUrl() {
		if (previewUrl) {
			await copyUrlToClipboard(previewUrl);
		}
	}
</script>

<!-- Hidden file input -->
<input
	bind:this={fileInputRef}
	type="file"
	accept={field.accept || 'image/*'}
	style="display: none"
	onchange={handleFileInputChange}
/>

{#if arrayItem}
	<!-- Minimal row for array items — thumbnail + name only, no controls -->
	{#if value && value.asset}
		<div class="flex items-center gap-3">
			<div
				class="bg-muted flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded"
			>
				{#if loadingAsset}
					<div class="border-primary h-4 w-4 animate-spin rounded-full border-b-2"></div>
				{:else if previewUrl}
					<img
						src={previewUrl}
						alt={value?.alt || assetData?.alt || displayName}
						class="h-full w-full object-cover"
						loading="lazy"
					/>
				{:else}
					<ImageIcon size={18} class="text-muted-foreground" />
				{/if}
			</div>
			<span class="truncate text-sm">{displayName}</span>
		</div>
	{:else}
		<span class="text-muted-foreground text-sm">No image</span>
	{/if}
{:else if compact}
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
						alt={value?.alt || assetData?.alt || displayName}
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
			{#if !isReadOnly}
				<DropdownMenu>
					<DropdownMenuTrigger>
						<Button variant="ghost" size="sm" class="h-8 w-8 p-0">
							<Ellipsis size={16} />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" class="!z-[9999]">
						<DropdownMenuGroup>
							<DropdownMenuItem onclick={openFileDialog} disabled={isUploading}>
								<Upload size={16} />
								Replace
							</DropdownMenuItem>
							<DropdownMenuItem
								onclick={() => {
									showAssetBrowser = true;
								}}
								disabled={isUploading}
							>
								<ImageIcon size={16} />
								Browse media
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onclick={removeImage}
							disabled={isUploading}
							class="text-destructive focus:text-destructive"
						>
							<CircleX size={16} />
							Clear field
						</DropdownMenuItem>
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
			disabled={isUploading || isReadOnly}
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
							alt={value?.alt || assetData?.alt || 'Uploaded image'}
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
				{#if !isReadOnly}
					<div class="absolute inset-2 flex items-start justify-end gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger>
								<Button variant="secondary" size="icon" class="h-8 w-8">
									<Ellipsis size={16} />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" class="!z-[9999]">
								<DropdownMenuGroup>
									<DropdownMenuItem onclick={openFileDialog} disabled={isUploading}>
										<Upload size={16} />
										Upload
									</DropdownMenuItem>
									<DropdownMenuItem
										onclick={() => {
											showAssetBrowser = true;
										}}
										disabled={isUploading}
									>
										<ImageIcon size={16} />
										Browse media
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem onclick={downloadImage} disabled={!previewUrl}>
										<Download size={16} />
										Download
									</DropdownMenuItem>
									<DropdownMenuItem onclick={copyUrl} disabled={!previewUrl}>
										<Copy size={16} />
										Copy URL
									</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									onclick={removeImage}
									disabled={isUploading}
									class="text-destructive focus:text-destructive"
								>
									<CircleX size={16} />
									Clear field
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				{/if}
			</div>

			<!-- Alt text — asset-level default + optional per-placement override -->
			<div class="border-border space-y-2 border-t p-3">
				<div class="space-y-1.5">
					<label class="text-sm font-medium" for="alt-{field.name}">Alt text</label>
					<p class="text-muted-foreground text-xs">
						Describes the image everywhere it's used (accessibility &amp; SEO).
					</p>
					<Input
						id="alt-{field.name}"
						type="text"
						placeholder="Describe this image..."
						value={assetAltText}
						oninput={(e) => updateAssetAlt(e.currentTarget.value)}
						disabled={isReadOnly}
					/>
				</div>

				{#if showOverride}
					<div class="space-y-1.5">
						<div class="flex items-center justify-between">
							<label
								class="text-muted-foreground text-xs font-medium"
								for="alt-override-{field.name}">Override for this placement</label
							>
							{#if !isReadOnly}
								<button
									type="button"
									class="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
									onclick={() => {
										updateOverrideAlt('');
										showOverride = false;
									}}
								>
									Remove
								</button>
							{/if}
						</div>
						<Input
							id="alt-override-{field.name}"
							type="text"
							placeholder={assetAltText || 'Describe this image...'}
							value={value?.alt ?? ''}
							oninput={(e) => updateOverrideAlt(e.currentTarget.value)}
							disabled={isReadOnly}
						/>
					</div>
				{:else if !isReadOnly}
					<button
						type="button"
						class="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
						onclick={() => (showOverride = true)}
					>
						+ Override for this placement
					</button>
				{/if}
			</div>
		</div>
	{:else}
		<!-- Sanity-style upload bar -->
		<div
			class="border-border flex h-12 items-center overflow-hidden rounded-md border transition-colors {validationClasses} {isReadOnly
				? ''
				: isDragging
					? 'border-primary bg-primary/5'
					: ''}"
			use:elementEvents={{
				events: [
					{ name: 'dragenter', handler: handleDragEnter },
					{ name: 'dragover', handler: handleDragOver },
					{ name: 'drop', handler: handleDrop },
					{ name: 'dragleave', handler: handleDragLeave }
				]
			}}
		>
			<!-- Drop zone text -->
			<div class="flex flex-1 items-center gap-2 px-3">
				{#if isUploading}
					<div
						class="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
					></div>
					<span class="text-muted-foreground text-sm">Uploading...</span>
				{:else}
					<FileImage size={16} class="text-muted-foreground" />
					<span class="text-muted-foreground text-sm">
						{isReadOnly ? 'No image' : isDragging ? 'Drop image here' : 'Drag or paste image here'}
					</span>
				{/if}
			</div>

			<!-- Buttons -->
			<div class="flex items-center gap-1 pr-2">
				<button
					onclick={openFileDialog}
					disabled={isUploading || isReadOnly}
					type="button"
					class="text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 text-sm transition-colors disabled:opacity-50"
				>
					<Upload size={14} />
					Upload
				</button>
				<button
					disabled={isUploading || isReadOnly}
					type="button"
					onclick={() => {
						showAssetBrowser = true;
					}}
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
