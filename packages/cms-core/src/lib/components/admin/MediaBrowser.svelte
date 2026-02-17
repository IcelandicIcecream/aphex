<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Separator } from '@aphexcms/ui/shadcn/separator';
	import * as Dialog from '@aphexcms/ui/shadcn/dialog';
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
		FileImage,
		ChevronLeft,
		ChevronRight,
		Download,
		Link,
		CheckCircle2,
		AlertCircle
	} from '@lucide/svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { assets } from '../../api/assets';
	import type { AssetReference } from '../../api/assets';
	import type { Asset } from '../../types/asset';
	import { toast } from 'svelte-sonner';
	import { copyUrlToClipboard, downloadFile } from '../../utils/asset-actions';

	interface Props {
		/** When true, shows a "Select" button for picking an asset */
		selectable?: boolean;
		/** Callback when an asset is selected (selectable mode) */
		onSelect?: (asset: Asset) => void;
		/** Filter to specific asset type */
		assetTypeFilter?: 'image' | 'file';
		/** Number of assets per page */
		pageSize?: number;
		/** Whether this tab is currently active (triggers refetch when becoming active) */
		active?: boolean;
	}

	let { selectable = false, onSelect, assetTypeFilter, pageSize = 30, active = true }: Props = $props();

	// State
	let assetList = $state<Asset[]>([]);
	let loading = $state(false);
	let searchQuery = $state('');
	let viewMode = $state<'grid' | 'list'>('grid');
	let sortOrder = $state<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest');

	let selectedAsset = $state<Asset | null>(null);
	let lightboxOpen = $state(false);
	let currentPage = $state(1);
	let totalPages = $state(1);
	let totalAssets = $state(0);

	// Upload state
	let isUploading = $state(false);
	let isDragging = $state(false);
	let showUploadModal = $state(false);
	let modalFileInputRef: HTMLInputElement;
	let modalIsDragging = $state(false);

	interface UploadQueueItem {
		file: File;
		status: 'pending' | 'uploading' | 'done' | 'failed';
	}
	let uploadQueue = $state<UploadQueueItem[]>([]);

	// Detail editing state
	let editTitle = $state('');
	let editDescription = $state('');
	let editAlt = $state('');
	let editCreditLine = $state('');
	let isSaving = $state(false);

	// Bulk selection state (list view)
	let selectedIds = $state<Set<string>>(new Set());
	let isBulkDeleting = $state(false);

	// Reference tracking state
	let referenceCounts = $state<Record<string, number>>({});
	let detailTab = $state<'details' | 'references'>('details');
	let selectedAssetRefs = $state<AssetReference[]>([]);
	let loadingRefs = $state(false);
	let selectedRefCount = $state(0);

	// Debounced search
	let searchTimeout: ReturnType<typeof setTimeout>;

	function handleSearchInput(value: string) {
		searchQuery = value;
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			currentPage = 1;
			fetchAssets();
		}, 300);
	}

	// Fetch assets
	async function fetchAssets(page = currentPage) {
		loading = true;
		try {
			const offset = (page - 1) * pageSize;
			const result = await assets.list({
				assetType: assetTypeFilter,
				search: searchQuery || undefined,
				limit: pageSize,
				offset
			});

			if (result.success && result.data) {
				assetList = result.data;
				currentPage = page;
				if (result.pagination) {
					totalPages = result.pagination.totalPages;
					totalAssets = result.pagination.total;
				}
				// Clear bulk selection on page change
				selectedIds = new Set();
				// Fetch reference counts for this page
				fetchReferenceCounts(result.data.map((a) => a.id));
			}
		} catch (err) {
			toast.error('Failed to fetch assets');
		} finally {
			loading = false;
		}
	}

	function goToPage(page: number) {
		if (page < 1 || page > totalPages || page === currentPage) return;
		fetchAssets(page);
	}

	// Fetch reference counts for current page of assets
	async function fetchReferenceCounts(assetIds: string[]) {
		if (assetIds.length === 0) return;
		try {
			const result = await assets.getReferenceCounts(assetIds);
			if (result.success && result.data) {
				referenceCounts = { ...referenceCounts, ...result.data };
			}
		} catch (err) {
			toast.error('Failed to fetch reference counts');
		}
	}

	// Fetch full references for a specific asset (sidebar)
	async function fetchAssetReferences(assetId: string) {
		loadingRefs = true;
		try {
			const result = await assets.getReferences(assetId);
			if (result.success && result.data) {
				selectedAssetRefs = result.data.references;
				selectedRefCount = result.data.total;
			}
		} catch (err) {
			toast.error('Failed to fetch asset references');
			selectedAssetRefs = [];
			selectedRefCount = 0;
		} finally {
			loadingRefs = false;
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

	// Bulk selection derived (must be after sortedAssets)
	const allSelected = $derived(
		sortedAssets.length > 0 && sortedAssets.every((a) => selectedIds.has(a.id))
	);

	function toggleSelectAll() {
		if (allSelected) {
			selectedIds = new Set();
		} else {
			selectedIds = new Set(sortedAssets.map((a) => a.id));
		}
	}

	function toggleSelect(id: string) {
		const next = new Set(selectedIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selectedIds = next;
	}

	async function bulkDelete() {
		if (selectedIds.size === 0) return;

		// Fetch fresh reference counts before checking
		const idsToCheck = [...selectedIds];
		try {
			const result = await assets.getReferenceCounts(idsToCheck);
			if (result.success && result.data) {
				referenceCounts = { ...referenceCounts, ...result.data };
			}
		} catch (err) {
			toast.error('Failed to check references');
		}

		// Check for referenced assets
		const referencedAssets = idsToCheck.filter((id) => (referenceCounts[id] || 0) > 0);
		if (referencedAssets.length > 0) {
			const names = referencedAssets
				.map((id) => assetList.find((a) => a.id === id)?.originalFilename || id)
				.join(', ');
			toast.error(`Cannot delete ${referencedAssets.length} asset${referencedAssets.length > 1 ? 's' : ''} — still referenced by documents. Remove the references first.`);
			return;
		}

		const count = selectedIds.size;
		if (!confirm(`Delete ${count} asset${count > 1 ? 's' : ''}? This cannot be undone.`)) return;

		isBulkDeleting = true;
		try {
			const result = await assets.deleteBulk([...selectedIds]);
			if (result.success) {
				if (selectedAsset && selectedIds.has(selectedAsset.id)) {
					selectedAsset = null;
				}
				selectedIds = new Set();
				await fetchAssets();
			}
		} catch (err) {
			toast.error('Failed to delete assets');
		} finally {
			isBulkDeleting = false;
		}
	}

	// Upload files via modal queue
	function addFilesToQueue(files: FileList | null) {
		if (!files || files.length === 0) return;
		const newItems: UploadQueueItem[] = Array.from(files).map((file) => ({
			file,
			status: 'pending' as const
		}));
		uploadQueue = [...uploadQueue, ...newItems];
		processUploadQueue();
	}

	async function processUploadQueue() {
		if (isUploading) return;
		isUploading = true;

		for (let i = 0; i < uploadQueue.length; i++) {
			if (uploadQueue[i]!.status !== 'pending') continue;
			uploadQueue[i]!.status = 'uploading';
			uploadQueue = [...uploadQueue]; // trigger reactivity

			try {
				const formData = new FormData();
				formData.append('file', uploadQueue[i]!.file);
				const result = await assets.upload(formData);
				uploadQueue[i]!.status = result.success ? 'done' : 'failed';
			} catch {
				uploadQueue[i]!.status = 'failed';
			}
			uploadQueue = [...uploadQueue];
		}

		isUploading = false;

		// If all done, refetch and close after a brief pause
		if (uploadQueue.every((item) => item.status === 'done' || item.status === 'failed')) {
			currentPage = 1;
			await fetchAssets(1);
			setTimeout(() => {
				showUploadModal = false;
				uploadQueue = [];
			}, 800);
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
		showUploadModal = true;
		addFilesToQueue(e.dataTransfer?.files || null);
	}

	// Select an asset for detail view
	function openAssetDetail(asset: Asset) {
		selectedAsset = asset;
		editTitle = asset.title || '';
		editDescription = asset.description || '';
		editAlt = asset.alt || '';
		editCreditLine = asset.creditLine || '';
		detailTab = 'details';
		selectedAssetRefs = [];
		selectedRefCount = referenceCounts[asset.id] || 0;
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
			toast.error('Failed to save metadata');
		} finally {
			isSaving = false;
		}
	}

	// Delete asset
	async function deleteAsset(asset: Asset) {
		const refCount = referenceCounts[asset.id] || 0;
		if (refCount > 0) {
			toast.error(`Cannot delete "${asset.originalFilename}" — referenced by ${refCount} document${refCount > 1 ? 's' : ''}. Remove the references first.`);
			return;
		}
		if (!confirm(`Delete "${asset.originalFilename}"? This cannot be undone.`)) return;
		try {
			const result = await assets.delete(asset.id);
			if (result.success) {
				if (selectedAsset?.id === asset.id) {
					selectedAsset = null;
				}
				await fetchAssets();
			}
		} catch (err) {
			toast.error('Failed to delete asset');
		}
	}

	// Copy URL state
	let copiedUrl = $state(false);

	async function copyAssetUrl(asset: Asset) {
		const url = getThumbnailUrl(asset);
		const success = await copyUrlToClipboard(url);
		if (success) {
			copiedUrl = true;
			setTimeout(() => (copiedUrl = false), 2000);
		}
	}

	function downloadAsset(asset: Asset) {
		downloadFile(getThumbnailUrl(asset), asset.originalFilename);
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

	// Compute visible page numbers (show up to 5 pages with ellipsis)
	const visiblePages = $derived.by(() => {
		const pages: (number | '...')[] = [];
		if (totalPages <= 7) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			pages.push(1);
			if (currentPage > 3) pages.push('...');
			const start = Math.max(2, currentPage - 1);
			const end = Math.min(totalPages - 1, currentPage + 1);
			for (let i = start; i <= end; i++) pages.push(i);
			if (currentPage < totalPages - 2) pages.push('...');
			pages.push(totalPages);
		}
		return pages;
	});

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

	// Track org changes to refetch assets
	let currentOrgId = $state<string | null>(null);

	// Track whether we've been active before to detect tab switches
	let wasActive = $state(false);

	// Load on mount and refetch when org changes
	$effect(() => {
		const orgId = page.url.searchParams.get('orgId');
		if (orgId !== currentOrgId) {
			currentOrgId = orgId;
			selectedAsset = null;
			currentPage = 1;
			fetchAssets(1);
		}
	});

	// Refetch when tab becomes active (switching from another tab)
	$effect(() => {
		if (active && wasActive) {
			fetchAssets();
		}
		wasActive = active;
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
	<div class="border-border flex items-center justify-between border-b px-4 py-3 sm:px-6 sm:py-4">
		<h2 class="text-base font-semibold sm:text-lg">Browse Assets</h2>
		<Button size="sm" onclick={() => { showUploadModal = true; uploadQueue = []; }}>
			<Upload size={16} class="sm:mr-2" />
			<span class="hidden sm:inline">Upload assets</span>
		</Button>
	</div>

	<!-- Toolbar -->
	<div class="border-border flex flex-wrap items-center gap-2 border-b px-4 py-2 sm:gap-3 sm:px-6 sm:py-3">
		<div class="relative min-w-0 flex-1 sm:flex-none sm:w-48">
			<Search size={14} class="text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
			<Input
				placeholder="Search"
				class="h-8 pl-8 text-sm"
				value={searchQuery}
				oninput={(e) => handleSearchInput((e.target as HTMLInputElement).value)}
			/>
		</div>

		{#if totalAssets > 0}
			<span class="text-muted-foreground hidden text-xs sm:inline">
				{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalAssets)} of {totalAssets}
			</span>
		{/if}
		<div class="hidden flex-1 sm:block"></div>

		<!-- Page size -->
		<div class="hidden items-center gap-1.5 sm:flex">
			<span class="text-muted-foreground text-xs">Show</span>
			<select
				value={pageSize}
				onchange={(e) => {
					pageSize = parseInt((e.target as HTMLSelectElement).value);
					currentPage = 1;
					fetchAssets(1);
				}}
				class="border-input bg-background text-foreground h-7 rounded-md border px-1.5 text-xs"
			>
				<option value={10}>10</option>
				<option value={20}>20</option>
				<option value={30}>30</option>
				<option value={50}>50</option>
				<option value={100}>100</option>
			</select>
		</div>

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
			class="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors sm:gap-1.5"
		>
			<ArrowDownUp size={14} />
			<span class="hidden sm:inline">{sortLabel}</span>
		</button>

	</div>

	<!-- Content area -->
	<div class="flex flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">
		<!-- Main content (hidden on mobile when asset detail is open) -->
		<div class="min-h-0 flex-1 md:overflow-y-auto {selectedAsset && !selectable ? 'hidden md:block' : ''}">
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
				<div class="grid grid-cols-2 gap-0.5 p-1 sm:grid-cols-5 xl:grid-cols-10">
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

				<!-- Pagination -->
				{#if totalPages > 1}
					<div class="border-border flex items-center justify-center gap-1 border-t px-4 py-3">
						<button
							onclick={() => goToPage(currentPage - 1)}
							disabled={currentPage <= 1 || loading}
							class="rounded p-1.5 transition-colors hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
						>
							<ChevronLeft size={16} />
						</button>
						{#each visiblePages as pg}
							{#if pg === '...'}
								<span class="text-muted-foreground px-1.5 text-sm">...</span>
							{:else}
								<button
									onclick={() => goToPage(pg)}
									disabled={loading}
									class="min-w-[32px] rounded px-2 py-1 text-sm font-medium transition-colors {pg === currentPage
										? 'bg-foreground text-background'
										: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
								>
									{pg}
								</button>
							{/if}
						{/each}
						<button
							onclick={() => goToPage(currentPage + 1)}
							disabled={currentPage >= totalPages || loading}
							class="rounded p-1.5 transition-colors hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
						>
							<ChevronRight size={16} />
						</button>
					</div>
				{/if}
			{:else}
				<!-- List View -->
				<div class="w-full">
					<!-- Bulk action bar -->
					{#if selectedIds.size > 0}
						<div class="bg-muted border-border flex items-center gap-3 border-b px-4 py-2">
							<span class="text-sm font-medium">
								{selectedIds.size} selected
							</span>
							<Button
								variant="destructive"
								size="sm"
								onclick={bulkDelete}
								disabled={isBulkDeleting}
							>
								<Trash2 size={14} class="mr-1.5" />
								{isBulkDeleting ? 'Deleting...' : 'Delete'}
							</Button>
							<button
								onclick={() => (selectedIds = new Set())}
								class="text-muted-foreground hover:text-foreground text-sm transition-colors"
							>
								Clear selection
							</button>
						</div>
					{/if}

					<!-- Table header -->
					<div class="bg-muted/30 border-border hidden items-center gap-4 border-b px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid md:grid-cols-[auto_40px_1fr_100px_100px_80px_50px_100px]">
						<div class="w-4">
							<input
								type="checkbox"
								class="rounded"
								checked={allSelected}
								onchange={toggleSelectAll}
							/>
						</div>
						<div></div>
						<div>Filename</div>
						<div>Resolution</div>
						<div>Mime type</div>
						<div>Size</div>
						<div>Refs</div>
						<div>Last updated</div>
					</div>
					<!-- Mobile header -->
					<div class="bg-muted/30 border-border flex items-center gap-3 border-b px-4 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground md:hidden">
						<div class="w-4">
							<input
								type="checkbox"
								class="rounded"
								checked={allSelected}
								onchange={toggleSelectAll}
							/>
						</div>
						<div>Assets</div>
					</div>
					{#each sortedAssets as asset (asset.id)}
						<!-- Desktop row -->
						<button
							onclick={() => {
								if (selectable && onSelect) {
									onSelect(asset);
								} else {
									openAssetDetail(asset);
								}
							}}
							class="border-border hidden w-full items-center gap-4 border-b px-4 py-2 text-left transition-colors md:grid md:grid-cols-[auto_40px_1fr_100px_100px_80px_50px_100px] {selectedAsset?.id === asset.id
								? 'bg-muted'
								: selectedIds.has(asset.id)
									? 'bg-muted/70'
									: 'hover:bg-muted/50'}"
						>
							<div class="w-4">
								<input
									type="checkbox"
									class="rounded"
									checked={selectedIds.has(asset.id)}
									onclick={(e) => {
										e.stopPropagation();
										toggleSelect(asset.id);
									}}
								/>
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
							<div class="text-muted-foreground text-xs">{referenceCounts[asset.id] || 0}</div>
							<div class="text-muted-foreground text-xs">{formatDate(asset.updatedAt || asset.createdAt)}</div>
						</button>
						<!-- Mobile row -->
						<button
							onclick={() => {
								if (selectable && onSelect) {
									onSelect(asset);
								} else {
									openAssetDetail(asset);
								}
							}}
							class="border-border flex w-full items-center gap-3 border-b px-4 py-2 text-left transition-colors md:hidden {selectedAsset?.id === asset.id
								? 'bg-muted'
								: selectedIds.has(asset.id)
									? 'bg-muted/70'
									: 'hover:bg-muted/50'}"
						>
							<div class="w-4">
								<input
									type="checkbox"
									class="rounded"
									checked={selectedIds.has(asset.id)}
									onclick={(e) => {
										e.stopPropagation();
										toggleSelect(asset.id);
									}}
								/>
							</div>
							<div class="bg-muted/30 h-10 w-10 shrink-0 overflow-hidden rounded">
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
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm">{asset.originalFilename}</p>
								<p class="text-muted-foreground text-xs">{formatSize(asset.size)}</p>
							</div>
						</button>
					{/each}

					<!-- Pagination -->
					{#if totalPages > 1}
						<div class="border-border flex items-center justify-center gap-1 border-t px-4 py-3">
							<button
								onclick={() => goToPage(currentPage - 1)}
								disabled={currentPage <= 1 || loading}
								class="rounded p-1.5 transition-colors hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
							>
								<ChevronLeft size={16} />
							</button>
							{#each visiblePages as pg}
								{#if pg === '...'}
									<span class="text-muted-foreground px-1.5 text-sm">...</span>
								{:else}
									<button
										onclick={() => goToPage(pg)}
										disabled={loading}
										class="min-w-[32px] rounded px-2 py-1 text-sm font-medium transition-colors {pg === currentPage
											? 'bg-foreground text-background'
											: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
									>
										{pg}
									</button>
								{/if}
							{/each}
							<button
								onclick={() => goToPage(currentPage + 1)}
								disabled={currentPage >= totalPages || loading}
								class="rounded p-1.5 transition-colors hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
							>
								<ChevronRight size={16} />
							</button>
						</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Asset Detail Sidebar (extends page on mobile, side panel on desktop) -->
		{#if selectedAsset && !selectable}
			<div class="bg-background border-border border-t md:border-t-0 md:w-[350px] md:shrink-0 md:border-l md:overflow-y-auto flex flex-col">
				<!-- Header -->
				<div class="border-border flex items-center justify-between border-b px-4 py-3">
					<!-- Back button (mobile only) -->
					<button
						onclick={closeAssetDetail}
						class="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors md:hidden"
					>
						<ChevronLeft size={16} />
						Back
					</button>
					<!-- Filename -->
					<p class="min-w-0 flex-1 truncate text-sm font-medium md:pl-0 pl-2" title={selectedAsset.originalFilename}>
						{selectedAsset.originalFilename}
					</p>
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
							class="h-7 w-7 p-0 hidden md:flex"
							onclick={closeAssetDetail}
							title="Close"
						>
							<X size={14} />
						</Button>
					</div>
				</div>

				<!-- Preview (click to enlarge) -->
				<div class="p-4 pb-0">
					{#if isImage(selectedAsset)}
						<button
							onclick={() => (lightboxOpen = true)}
							class="bg-muted/30 mb-3 w-full cursor-zoom-in overflow-hidden rounded-lg"
							title="Click to enlarge"
						>
							<img
								src={getThumbnailUrl(selectedAsset)}
								alt={selectedAsset.alt || selectedAsset.originalFilename}
								class="w-full object-contain"
								style="max-height: 200px;"
							/>
						</button>
					{:else}
						<div class="bg-muted/30 mb-3 flex h-28 items-center justify-center overflow-hidden rounded-lg">
							<FileText class="text-muted-foreground h-12 w-12" />
						</div>
					{/if}
				</div>

				<!-- Tabs -->
				<div class="border-border flex border-b">
					<button
						onclick={() => (detailTab = 'details')}
						class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors {detailTab === 'details'
							? 'border-foreground text-foreground border-b-2'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						Details
					</button>
					<button
						onclick={() => {
							detailTab = 'references';
							if (selectedAssetRefs.length === 0 && selectedAsset) {
								fetchAssetReferences(selectedAsset.id);
							}
						}}
						class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors {detailTab === 'references'
							? 'border-foreground text-foreground border-b-2'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						References ({selectedRefCount})
					</button>
				</div>

				<!-- Tab content -->
				<div class="flex-1 overflow-y-auto p-4">
					{#if detailTab === 'details'}
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

						<!-- Actions -->
						<div class="mb-4 flex gap-2">
							<Button
								variant="outline"
								size="sm"
								class="flex-1"
								onclick={() => downloadAsset(selectedAsset!)}
							>
								<Download size={14} class="mr-1.5" />
								Download
							</Button>
							<Button
								variant="outline"
								size="sm"
								class="flex-1"
								onclick={() => copyAssetUrl(selectedAsset!)}
							>
								<Link size={14} class="mr-1.5" />
								{copiedUrl ? 'Copied!' : 'Copy URL'}
							</Button>
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
					{:else}
						<!-- References tab -->
						{#if loadingRefs}
							<p class="text-muted-foreground text-sm">Loading references...</p>
						{:else if selectedAssetRefs.length === 0}
							<p class="text-muted-foreground text-sm">Not used in any documents</p>
						{:else}
							<div class="space-y-1">
								{#each selectedAssetRefs as ref}
									<button
										onclick={() => {
											const params = new URLSearchParams(page.url.searchParams);
											params.set('docType', ref.type);
											params.set('docId', ref.documentId);
											params.set('view', 'structure');
											params.delete('action');
											goto(`/admin?${params.toString()}`);
										}}
										class="hover:bg-muted flex w-full items-center gap-3 rounded-md p-2.5 text-left transition-colors"
									>
										<div class="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded">
											<FileText size={16} class="text-muted-foreground" />
										</div>
										<div class="min-w-0">
											<p class="truncate text-sm font-medium">{ref.title}</p>
											<p class="text-muted-foreground truncate text-xs">
												{ref.type}{ref.status ? ` · ${ref.status}` : ''}
											</p>
										</div>
									</button>
								{/each}
							</div>
						{/if}
					{/if}
				</div>
			</div>
		{/if}

	</div>
</div>

<!-- Lightbox Modal -->
{#if selectedAsset && isImage(selectedAsset)}
	<Dialog.Root bind:open={lightboxOpen}>
		<Dialog.Content showCloseButton={false} class="flex max-h-[90vh] max-w-[90vw] sm:max-w-[90vw] flex-col overflow-hidden p-0">
			<Dialog.Header class="border-border border-b px-4 py-3">
				<Dialog.Title class="truncate text-sm font-medium">{selectedAsset.originalFilename}</Dialog.Title>
			</Dialog.Header>
			<div class="flex flex-1 items-center justify-center overflow-hidden p-4">
				<img
					src={getThumbnailUrl(selectedAsset)}
					alt={selectedAsset.alt || selectedAsset.originalFilename}
					class="max-h-[70vh] max-w-full object-contain"
				/>
			</div>
			<div class="border-border flex items-center justify-between border-t px-4 py-3">
				<div class="flex items-center gap-2">
					<Button variant="outline" size="sm" onclick={() => downloadAsset(selectedAsset!)}>
						<Download size={14} class="mr-1.5" />
						Download
					</Button>
					<Button variant="outline" size="sm" onclick={() => copyAssetUrl(selectedAsset!)}>
						<Link size={14} class="mr-1.5" />
						{copiedUrl ? 'Copied!' : 'Copy URL'}
					</Button>
				</div>
				<Button variant="outline" size="sm" onclick={() => (lightboxOpen = false)}>Close</Button>
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<!-- Upload Modal -->
<Dialog.Root bind:open={showUploadModal} onOpenChange={(v) => { if (!v && !isUploading) { showUploadModal = false; } }}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Upload Assets</Dialog.Title>
		</Dialog.Header>

		<!-- Drop zone -->
		<div
			class="border-border mt-2 flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors {modalIsDragging ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}"
			ondragover={(e) => { e.preventDefault(); modalIsDragging = true; }}
			ondragleave={(e) => { e.preventDefault(); modalIsDragging = false; }}
			ondrop={(e) => { e.preventDefault(); modalIsDragging = false; addFilesToQueue(e.dataTransfer?.files || null); }}
			role="button"
			tabindex="0"
			onclick={() => modalFileInputRef?.click()}
			onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') modalFileInputRef?.click(); }}
		>
			<FileImage size={32} class="text-muted-foreground mb-3" />
			<p class="text-sm font-medium">{modalIsDragging ? 'Drop files here' : 'Drag and drop files here'}</p>
			<p class="text-muted-foreground mt-1 text-xs">or click to browse</p>
		</div>

		<input
			bind:this={modalFileInputRef}
			type="file"
			multiple
			accept="image/*,.pdf,.txt"
			class="hidden"
			onchange={(e) => {
				const target = e.target as HTMLInputElement;
				addFilesToQueue(target.files);
				target.value = '';
			}}
		/>

		<!-- Upload queue -->
		{#if uploadQueue.length > 0}
			<div class="mt-4 max-h-48 space-y-2 overflow-y-auto">
				{#each uploadQueue as item}
					<div class="border-border flex items-center gap-3 rounded-md border px-3 py-2">
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm">{item.file.name}</p>
							<p class="text-muted-foreground text-xs">{formatSize(item.file.size)}</p>
						</div>
						{#if item.status === 'uploading'}
							<div class="border-primary h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-t-transparent"></div>
						{:else if item.status === 'done'}
							<CheckCircle2 size={16} class="shrink-0 text-green-500" />
						{:else if item.status === 'failed'}
							<AlertCircle size={16} class="text-destructive shrink-0" />
						{:else}
							<div class="bg-muted h-4 w-4 shrink-0 rounded-full"></div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
