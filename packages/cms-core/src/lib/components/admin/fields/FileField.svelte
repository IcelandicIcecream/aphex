<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Upload, File as FileIcon, Download, Copy, CircleX } from '@lucide/svelte';
	import type { FileValue } from '../../../types/asset';
	import type { FileField as FileFieldType } from '../../../types/schemas';
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
	import { usePermissions } from '../../../permissions-context.svelte';

	interface Props {
		field: FileFieldType;
		value: FileValue | null;
		validationClasses?: string;
		onUpdate: (value: FileValue | null) => void;
		schemaType?: string;
		fieldPath?: string;
		readonly?: boolean;
		compact?: boolean;
		arrayItem?: boolean;
		organizationId?: string;
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

	// Read-only when forced by caller OR the user lacks asset.upload. Keeps
	// the `readonly` prop as an explicit override for hosts that want to
	// neutralise the field regardless of RBAC state.
	const perms = usePermissions();
	const isReadOnly = $derived(readonly || !perms.can('asset.upload'));

	let isDragging = $state(false);
	// Drag-counter to defeat the dragleave/dragenter flicker — see ImageField for rationale.
	let dragDepth = 0;
	let isUploading = $state(false);
	let uploadError = $state<string | null>(null);
	let fileInputRef: HTMLInputElement;
	let showAssetBrowser = $state(false);

	// Build accept string for file input from field.accept array
	const acceptString = $derived(field.accept ? field.accept.join(',') : undefined);

	async function uploadFile(file: File): Promise<FileValue | null> {
		isUploading = true;
		uploadError = null;

		try {
			const formData = new FormData();
			formData.append('file', file);

			if (organizationId) formData.append('organizationId', organizationId);
			if (schemaType) formData.append('schemaType', schemaType);
			if (fieldPath) formData.append('fieldPath', fieldPath);

			// Pass allowed MIME types for server-side validation
			if (field.accept) {
				formData.append('allowedMimeTypes', JSON.stringify(field.accept));
			}
			if (field.maxSize) {
				formData.append('maxSize', String(field.maxSize));
			}

			const result = await assets.upload(formData);

			if (!result.success) {
				throw new Error(result.error || 'Upload failed');
			}

			const asset = result.data;

			return {
				_type: 'file',
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

	async function handleFileSelect(files: FileList | null) {
		if (isReadOnly || !files || files.length === 0) return;

		const file = files[0]!;

		// Client-side size check
		if (field.maxSize && file.size > field.maxSize) {
			const maxMB = (field.maxSize / (1024 * 1024)).toFixed(1);
			uploadError = `File exceeds maximum size of ${maxMB} MB`;
			return;
		}

		const fileValue = await uploadFile(file);
		if (fileValue) {
			onUpdate(fileValue);
		}
	}

	function handleDragEnter(event: DragEvent) {
		if (isReadOnly) return;
		event.preventDefault();
		dragDepth++;
		isDragging = true;
	}

	function handleDragOver(event: DragEvent) {
		if (isReadOnly) return;
		event.preventDefault();
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

	function handleFileInputChange(event: Event) {
		if (isReadOnly) return;
		const target = event.target as HTMLInputElement;
		handleFileSelect(target.files);
	}

	function openFileDialog() {
		if (isReadOnly) return;
		fileInputRef?.click();
	}

	function removeFile() {
		if (isReadOnly) return;
		onUpdate(null);
		uploadError = null;
	}

	// Asset data state
	let assetData = $state<any>(null);
	let loadingAsset = $state(false);
	let lastAssetId = $state<string | null>(null);

	$effect(() => {
		async function loadAsset() {
			const assetId = value?.asset?._ref || null;

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
						toast.error('Failed to load file asset');
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

	const fileUrl = $derived(assetData?.url || null);

	const displayName = $derived(
		assetData?.originalFilename || assetData?.filename || value?.asset?._ref || 'File'
	);

	const fileSize = $derived(
		assetData?.size
			? assetData.size > 1024 * 1024
				? `${(assetData.size / (1024 * 1024)).toFixed(1)} MB`
				: `${(assetData.size / 1024).toFixed(1)} KB`
			: null
	);

	const fileMime = $derived(assetData?.mimeType || null);

	function downloadAsset() {
		if (fileUrl) {
			downloadFile(fileUrl, displayName);
		}
	}

	async function copyUrl() {
		if (fileUrl) {
			await copyUrlToClipboard(fileUrl);
		}
	}
</script>

<!-- Hidden file input -->
<input
	bind:this={fileInputRef}
	type="file"
	accept={acceptString}
	style="display: none"
	onchange={handleFileInputChange}
/>

{#if arrayItem}
	<!-- Minimal row for array items -->
	{#if value && value.asset}
		<div class="flex items-center gap-3">
			<div
				class="bg-muted flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded"
			>
				{#if loadingAsset}
					<div class="border-primary h-4 w-4 animate-spin rounded-full border-b-2"></div>
				{:else}
					<FileIcon size={18} class="text-muted-foreground" />
				{/if}
			</div>
			<div class="min-w-0 flex-1">
				<span class="truncate text-sm">{displayName}</span>
				{#if fileSize}
					<span class="text-muted-foreground text-xs"> - {fileSize}</span>
				{/if}
			</div>
		</div>
	{:else}
		<span class="text-muted-foreground text-sm">No file</span>
	{/if}
{:else if compact}
	<!-- Compact mode for arrays -->
	{#if value && value.asset}
		<div class="border-border flex items-center gap-3 rounded-md border p-2 {validationClasses}">
			<div
				class="bg-muted flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded"
			>
				{#if loadingAsset}
					<div class="border-primary h-4 w-4 animate-spin rounded-full border-b-2"></div>
				{:else}
					<FileIcon size={20} class="text-muted-foreground" />
				{/if}
			</div>

			<div class="flex-1 overflow-hidden">
				<p class="truncate text-sm font-medium">{displayName}</p>
				{#if fileSize || fileMime}
					<p class="text-muted-foreground text-xs">
						{fileMime || ''}{fileSize ? ` - ${fileSize}` : ''}
					</p>
				{/if}
			</div>

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
								<FileIcon size={16} />
								Browse media
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onclick={removeFile}
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
				Upload File
			{/if}
		</Button>
	{/if}
{:else}
	<!-- Full mode -->
	{#if value && value.asset}
		<div class="border-border overflow-hidden rounded-md border {validationClasses}">
			<!-- File info card -->
			<div class="flex items-center gap-4 p-4">
				<div class="bg-muted flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg">
					{#if loadingAsset}
						<div class="border-primary h-6 w-6 animate-spin rounded-full border-b-2"></div>
					{:else}
						<FileIcon size={28} class="text-muted-foreground" />
					{/if}
				</div>

				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium">{displayName}</p>
					<div class="text-muted-foreground flex items-center gap-2 text-xs">
						{#if fileMime}
							<span>{fileMime}</span>
						{/if}
						{#if fileSize}
							<span>{fileSize}</span>
						{/if}
					</div>
				</div>

				<!-- Controls -->
				{#if !isReadOnly}
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
									Replace
								</DropdownMenuItem>
								<DropdownMenuItem
									onclick={() => {
										showAssetBrowser = true;
									}}
									disabled={isUploading}
								>
									<FileIcon size={16} />
									Browse media
								</DropdownMenuItem>
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								<DropdownMenuItem onclick={downloadAsset} disabled={!fileUrl}>
									<Download size={16} />
									Download
								</DropdownMenuItem>
								<DropdownMenuItem onclick={copyUrl} disabled={!fileUrl}>
									<Copy size={16} />
									Copy URL
								</DropdownMenuItem>
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onclick={removeFile}
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
		</div>
	{:else}
		<!-- Upload bar -->
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
			<div class="flex flex-1 items-center gap-2 px-3">
				{#if isUploading}
					<div
						class="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
					></div>
					<span class="text-muted-foreground text-sm">Uploading...</span>
				{:else}
					<FileIcon size={16} class="text-muted-foreground" />
					<span class="text-muted-foreground text-sm">
						{isReadOnly ? 'No file' : isDragging ? 'Drop file here' : 'Drag or select a file'}
					</span>
				{/if}
			</div>

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
					<FileIcon size={14} />
					Select
				</button>
			</div>
		</div>
	{/if}
{/if}

{#if uploadError}
	<p class="text-destructive mt-2 text-sm">{uploadError}</p>
{/if}

{#if field.accept}
	<p class="text-muted-foreground mt-1 text-xs">
		Accepted: {field.accept.join(', ')}
	</p>
{/if}

<!-- Asset Browser Modal -->
<AssetBrowserModal
	bind:open={showAssetBrowser}
	onOpenChange={(v) => (showAssetBrowser = v)}
	assetTypeFilter="file"
	onSelect={(asset) => {
		const fileValue: FileValue = {
			_type: 'file',
			asset: {
				_type: 'reference',
				_ref: asset.id
			}
		};
		onUpdate(fileValue);
	}}
/>
