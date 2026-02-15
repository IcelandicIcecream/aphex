<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Separator } from '@aphexcms/ui/shadcn/separator';
	import {
		Upload,
		Search,
		Grid3x3,
		List,
		ArrowDownUp,
		X,
		Trash2,
		Image as ImageIcon,
		FileText,
		Tag
	} from '@lucide/svelte';
	import { assets } from '../../api/assets';
	import type { Asset } from '../../types/asset';

	interface Props {
		/** When true, shows a "Select" button for picking an asset */
		selectable?: boolean;
		/** Callback when an asset is selected (selectable mode) */
		onSelect?: (asset: Asset) => void;
		/** Filter to specific asset type */
		assetTypeFilter?: 'image' | 'file';
	}

	let { selectable = false, onSelect, assetTypeFilter }: Props = $props();

	// State
	let assetList = $state<Asset[]>([]);
	let loading = $state(false);
	let searchQuery = $state('');
	let viewMode = $state<'grid' | 'list'>('grid');
	let sortOrder = $state<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest');
	let showTagsSidebar = $state(false);
	let selectedAsset = $state<Asset | null>(null);
	let currentOffset = $state(0);
	let hasMore = $state(false);
	const PAGE_SIZE = 30;

	// Upload state
	let isUploading = $state(false);
	let isDragging = $state(false);
	let fileInputRef: HTMLInputElement;

	// Detail editing state
	let editTitle = $state('');
	let editDescription = $state('');
	let editAlt = $state('');
	let editCreditLine = $state('');
	let isSaving = $state(false);

	// Debounced search
	let searchTimeout: ReturnType<typeof setTimeout>;

	function handleSearchInput(value: string) {
		searchQuery = value;
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			currentOffset = 0;
			fetchAssets(true);
		}, 300);
	}

	// Fetch assets
	async function fetchAssets(reset = false) {
		loading = true;
		try {
			const result = await assets.list({
				assetType: assetTypeFilter,
				search: searchQuery || undefined,
				limit: PAGE_SIZE,
				offset: reset ? 0 : currentOffset
			});

			if (result.success && result.data) {
				if (reset) {
					assetList = result.data;
					currentOffset = result.data.length;
				} else {
					assetList = [...assetList, ...result.data];
					currentOffset += result.data.length;
				}
				hasMore = result.data.length === PAGE_SIZE;
			}
		} catch (err) {
			console.error('Failed to fetch assets:', err);
		} finally {
			loading = false;
		}
	}

	// Sort assets client-side
	const sortedAssets = $derived.by(() => {
		const sorted = [...assetList];
		switch (sortOrder) {
			case 'newest':
				return sorted.sort(
					(a, b) =>
						new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
				);
			case 'oldest':
				return sorted.sort(
					(a, b) =>
						new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
				);
			case 'name-asc':
				return sorted.sort((a, b) => a.originalFilename.localeCompare(b.originalFilename));
			case 'name-desc':
				return sorted.sort((a, b) => b.originalFilename.localeCompare(a.originalFilename));
			default:
				return sorted;
		}
	});

	// Upload file
	async function handleUpload(files: FileList | null) {
		if (!files || files.length === 0) return;

		isUploading = true;
		try {
			for (const file of Array.from(files)) {
				const formData = new FormData();
				formData.append('file', file);

				const result = await assets.upload(formData);
				if (result.success && result.data) {
					assetList = [result.data, ...assetList];
				}
			}
		} catch (err) {
			console.error('Failed to upload:', err);
		} finally {
			isUploading = false;
		}
	}

	// Drag and drop
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		handleUpload(e.dataTransfer?.files || null);
	}

	// Select an asset for detail view
	function openAssetDetail(asset: Asset) {
		selectedAsset = asset;
		editTitle = asset.title || '';
		editDescription = asset.description || '';
		editAlt = asset.alt || '';
		editCreditLine = asset.creditLine || '';
	}

	function closeAssetDetail() {
		selectedAsset = null;
	}

	// Save metadata
	async function saveMetadata() {
		if (!selectedAsset) return;
		isSaving = true;
		try {
			const result = await assets.update(selectedAsset.id, {
				title: editTitle || undefined,
				description: editDescription || undefined,
				alt: editAlt || undefined,
				creditLine: editCreditLine || undefined
			});
			if (result.success && result.data) {
				// Update in list
				assetList = assetList.map((a) => (a.id === selectedAsset!.id ? result.data! : a));
				selectedAsset = result.data;
			}
		} catch (err) {
			console.error('Failed to save metadata:', err);
		} finally {
			isSaving = false;
		}
	}

	// Delete asset
	async function deleteAsset(asset: Asset) {
		if (!confirm(`Delete "${asset.originalFilename}"? This cannot be undone.`)) return;
		try {
			const result = await assets.delete(asset.id);
			if (result.success) {
				assetList = assetList.filter((a) => a.id !== asset.id);
				if (selectedAsset?.id === asset.id) {
					selectedAsset = null;
				}
			}
		} catch (err) {
			console.error('Failed to delete asset:', err);
		}
	}

	// Format file size
	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	// Format date
	function formatDate(date: Date | string | null): string {
		if (!date) return '';
		const d = new Date(date);
		return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
	}

	// Get thumbnail URL
	function getThumbnailUrl(asset: Asset): string {
		return asset.url || `/media/${asset.id}/${asset.filename}`;
	}

	// Is image type
	function isImage(asset: Asset): boolean {
		return asset.assetType === 'image' || asset.mimeType.startsWith('image/');
	}

	// Sort label
	const sortLabel = $derived(
		sortOrder === 'newest'
			? 'Last created: Newest first'
			: sortOrder === 'oldest'
				? 'Last created: Oldest first'
				: sortOrder === 'name-asc'
					? 'Name: A-Z'
					: 'Name: Z-A'
	);

	// Cycle sort
	function cycleSort() {
		const orders: typeof sortOrder[] = ['newest', 'oldest', 'name-asc', 'name-desc'];
		const idx = orders.indexOf(sortOrder);
		sortOrder = orders[(idx + 1) % orders.length]!;
	}

	// Load on mount
	$effect(() => {
		fetchAssets(true);
	});
</script>

<div
	class="flex h-full flex-col"
	role="region"
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
>
	<!-- Drag overlay -->
	{#if isDragging}
		<div
			class="bg-primary/5 border-primary absolute inset-0 z-50 flex items-center justify-center border-2 border-dashed"
		>
			<div class="text-center">
				<Upload class="text-primary mx-auto mb-2 h-12 w-12" />
				<p class="text-primary text-lg font-medium">Drop files to upload</p>
			</div>
		</div>
	{/if}

	<!-- Header -->
	<div class="border-border flex items-center justify-between border-b px-6 py-4">
		<h2 class="text-lg font-semibold">Browse Assets</h2>
		<Button onclick={() => fileInputRef?.click()} disabled={isUploading}>
			<Upload size={16} class="mr-2" />
			{isUploading ? 'Uploading...' : 'Upload assets'}
		</Button>
		<input
			bind:this={fileInputRef}
			type="file"
			multiple
			accept="image/*,.pdf,.txt"
			class="hidden"
			onchange={(e) => {
				const target = e.target as HTMLInputElement;
				handleUpload(target.files);
				target.value = '';
			}}
		/>
	</div>

	<!-- Toolbar -->
	<div class="border-border flex items-center gap-3 border-b px-6 py-3">
		<div class="relative w-48">
			<Search size={14} class="text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
			<Input
				placeholder="Search"
				class="h-8 pl-8 text-sm"
				value={searchQuery}
				oninput={(e) => handleSearchInput((e.target as HTMLInputElement).value)}
			/>
		</div>

		<div class="flex-1"></div>

		<!-- View toggle -->
		<div class="bg-muted flex items-center rounded-md p-0.5">
			<button
				onclick={() => (viewMode = 'grid')}
				class="rounded p-1.5 {viewMode === 'grid'
					? 'bg-background shadow'
					: 'text-muted-foreground'}"
				title="Grid view"
			>
				<Grid3x3 size={14} />
			</button>
			<button
				onclick={() => (viewMode = 'list')}
				class="rounded p-1.5 {viewMode === 'list'
					? 'bg-background shadow'
					: 'text-muted-foreground'}"
				title="List view"
			>
				<List size={14} />
			</button>
		</div>

		<!-- Sort -->
		<button
			onclick={cycleSort}
			class="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors"
		>
			<ArrowDownUp size={14} />
			<span>{sortLabel}</span>
		</button>

		<!-- Tags toggle -->
		<button
			onclick={() => (showTagsSidebar = !showTagsSidebar)}
			class="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors {showTagsSidebar
				? 'bg-foreground text-background'
				: 'bg-muted text-muted-foreground hover:text-foreground'}"
		>
			<Tag size={14} />
			Tags
		</button>
	</div>

	<!-- Content area -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Main content -->
		<div class="flex-1 overflow-y-auto">
			{#if loading && assetList.length === 0}
				<div class="flex h-full items-center justify-center">
					<p class="text-muted-foreground">Loading assets...</p>
				</div>
			{:else if sortedAssets.length === 0}
				<div class="flex h-full flex-col items-center justify-center gap-4">
					<div class="bg-muted/50 flex h-16 w-16 items-center justify-center rounded-full">
						<ImageIcon class="text-muted-foreground h-8 w-8" />
					</div>
					<div class="text-center">
						<h3 class="mb-1 font-medium">No assets found</h3>
						<p class="text-muted-foreground text-sm">
							{searchQuery ? 'Try a different search term' : 'Upload your first asset to get started'}
						</p>
					</div>
				</div>
			{:else if viewMode === 'grid'}
				<!-- Grid View -->
				<div class="grid grid-cols-2 gap-0.5 p-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
					{#each sortedAssets as asset (asset.id)}
						<button
							onclick={() => {
								if (selectable && onSelect) {
									onSelect(asset);
								} else {
									openAssetDetail(asset);
								}
							}}
							class="group relative flex flex-col overflow-hidden rounded-sm transition-colors {selectedAsset?.id === asset.id
								? 'ring-primary ring-2'
								: 'hover:bg-muted/50'}"
						>
							<div class="bg-muted/30 relative aspect-square overflow-hidden">
								{#if isImage(asset)}
									<img
										src={getThumbnailUrl(asset)}
										alt={asset.alt || asset.originalFilename}
										class="h-full w-full object-contain"
										loading="lazy"
									/>
								{:else}
									<div class="flex h-full items-center justify-center">
										<FileText class="text-muted-foreground h-10 w-10" />
									</div>
								{/if}
							</div>
							<div class="p-1.5">
								<p class="text-muted-foreground truncate text-xs">
									{asset.originalFilename}
								</p>
							</div>
						</button>
					{/each}
				</div>

				<!-- Load more -->
				{#if hasMore}
					<div class="flex justify-center p-4">
						<Button variant="outline" size="sm" onclick={() => fetchAssets(false)} disabled={loading}>
							{loading ? 'Loading...' : 'Load more'}
						</Button>
					</div>
				{/if}
			{:else}
				<!-- List View -->
				<div class="w-full">
					<div class="bg-muted/30 border-border grid grid-cols-[auto_40px_1fr_100px_100px_80px_100px] items-center gap-4 border-b px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
						<div class="w-4"></div>
						<div></div>
						<div>Filename</div>
						<div>Resolution</div>
						<div>Mime type</div>
						<div>Size</div>
						<div>Last updated</div>
					</div>
					{#each sortedAssets as asset (asset.id)}
						<button
							onclick={() => {
								if (selectable && onSelect) {
									onSelect(asset);
								} else {
									openAssetDetail(asset);
								}
							}}
							class="border-border grid w-full grid-cols-[auto_40px_1fr_100px_100px_80px_100px] items-center gap-4 border-b px-4 py-2 text-left transition-colors {selectedAsset?.id === asset.id
								? 'bg-muted'
								: 'hover:bg-muted/50'}"
						>
							<div class="w-4">
								<input type="checkbox" class="rounded" onclick={(e) => e.stopPropagation()} />
							</div>
							<div class="bg-muted/30 h-10 w-10 overflow-hidden rounded">
								{#if isImage(asset)}
									<img
										src={getThumbnailUrl(asset)}
										alt={asset.alt || asset.originalFilename}
										class="h-full w-full object-cover"
										loading="lazy"
									/>
								{:else}
									<div class="flex h-full items-center justify-center">
										<FileText class="text-muted-foreground h-4 w-4" />
									</div>
								{/if}
							</div>
							<div class="min-w-0">
								<p class="truncate text-sm">{asset.originalFilename}</p>
							</div>
							<div class="text-muted-foreground text-xs">
								{asset.width && asset.height ? `${asset.width}x${asset.height}` : '-'}
							</div>
							<div class="text-muted-foreground text-xs">{asset.mimeType}</div>
							<div class="text-muted-foreground text-xs">{formatSize(asset.size)}</div>
							<div class="text-muted-foreground text-xs">{formatDate(asset.updatedAt || asset.createdAt)}</div>
						</button>
					{/each}

					{#if hasMore}
						<div class="flex justify-center p-4">
							<Button variant="outline" size="sm" onclick={() => fetchAssets(false)} disabled={loading}>
								{loading ? 'Loading...' : 'Load more'}
							</Button>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Asset Detail Sidebar -->
		{#if selectedAsset && !selectable}
			<div class="border-border w-[350px] shrink-0 overflow-y-auto border-l">
				<div class="p-4">
					<!-- Header -->
					<div class="mb-4 flex items-center justify-between">
						<h3 class="text-sm font-semibold">Asset Details</h3>
						<div class="flex items-center gap-1">
							<Button
								variant="ghost"
								size="sm"
								class="h-7 w-7 p-0"
								onclick={() => deleteAsset(selectedAsset!)}
								title="Delete asset"
							>
								<Trash2 size={14} class="text-destructive" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								class="h-7 w-7 p-0"
								onclick={closeAssetDetail}
								title="Close"
							>
								<X size={14} />
							</Button>
						</div>
					</div>

					<!-- Preview -->
					<div class="bg-muted/30 mb-4 overflow-hidden rounded-lg">
						{#if isImage(selectedAsset)}
							<img
								src={getThumbnailUrl(selectedAsset)}
								alt={selectedAsset.alt || selectedAsset.originalFilename}
								class="w-full object-contain"
								style="max-height: 250px;"
							/>
						{:else}
							<div class="flex h-32 items-center justify-center">
								<FileText class="text-muted-foreground h-12 w-12" />
							</div>
						{/if}
					</div>

					<!-- Info -->
					<div class="mb-4 space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-muted-foreground">Filename</span>
							<span class="max-w-[180px] truncate font-medium" title={selectedAsset.originalFilename}>
								{selectedAsset.originalFilename}
							</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Type</span>
							<span>{selectedAsset.mimeType}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-muted-foreground">Size</span>
							<span>{formatSize(selectedAsset.size)}</span>
						</div>
						{#if selectedAsset.width && selectedAsset.height}
							<div class="flex justify-between">
								<span class="text-muted-foreground">Dimensions</span>
								<span>{selectedAsset.width} x {selectedAsset.height}</span>
							</div>
						{/if}
						<div class="flex justify-between">
							<span class="text-muted-foreground">Uploaded</span>
							<span>{formatDate(selectedAsset.createdAt)}</span>
						</div>
					</div>

					<Separator class="my-4" />

					<!-- Metadata editing -->
					<div class="space-y-3">
						<div>
							<Label for="asset-title" class="text-xs">Title</Label>
							<Input id="asset-title" bind:value={editTitle} class="mt-1 h-8 text-sm" placeholder="Asset title" />
						</div>
						<div>
							<Label for="asset-description" class="text-xs">Description</Label>
							<textarea
								id="asset-description"
								bind:value={editDescription}
								class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring mt-1 flex w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
								rows="2"
								placeholder="Description"
							></textarea>
						</div>
						<div>
							<Label for="asset-alt" class="text-xs">Alt text</Label>
							<Input id="asset-alt" bind:value={editAlt} class="mt-1 h-8 text-sm" placeholder="Alternative text" />
						</div>
						<div>
							<Label for="asset-credit" class="text-xs">Credit line</Label>
							<Input id="asset-credit" bind:value={editCreditLine} class="mt-1 h-8 text-sm" placeholder="Credit / attribution" />
						</div>

						<Button onclick={saveMetadata} disabled={isSaving} size="sm" class="w-full">
							{isSaving ? 'Saving...' : 'Save changes'}
						</Button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Tags Sidebar -->
		{#if showTagsSidebar}
			<div class="border-border w-[200px] shrink-0 overflow-y-auto border-l p-4">
				<div class="flex items-center justify-between">
					<h3 class="text-sm font-semibold uppercase tracking-wider">Tags</h3>
				</div>
				<p class="text-muted-foreground mt-4 text-sm">No tags</p>
			</div>
		{/if}
	</div>
</div>
