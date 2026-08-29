<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Separator } from '@aphexcms/ui/shadcn/separator';
	import { Checkbox } from '@aphexcms/ui/shadcn/checkbox';
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
		AlertCircle,
		SquareCheckBig,
		Lock
	} from '@lucide/svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { assets } from '../../api/assets';
	import { ApiError } from '../../api/client';
	import { MAX_UPLOAD_BYTES, maxUploadFileBytes } from '../../api/limits';
	import { buildVariantUrl } from '../../storage/keys';
	import {
		canGenerateVariants,
		thumbnailWidth,
		usableWidths,
		type ImageConfig
	} from '../../images';
	import type { AssetDeleteConflict, AssetReference } from '../../api/assets';
	import type { Asset } from '../../types/asset';
	import { toast } from 'svelte-sonner';
	import { copyUrlToClipboard, downloadFile } from '../../utils/asset-actions';
	import { cmsLogger } from '../../utils/logger';
	import { SvelteSet } from 'svelte/reactivity';
	import { confirmDialog } from './confirm-dialog/confirm-dialog.svelte';
	import { usePermissions } from '../../permissions-context.svelte';

	interface Props {
		/** When true, shows a "Select" button for picking an asset */
		selectable?: boolean;
		/** When true, allows selecting multiple assets (used with selectable) */
		multiSelect?: boolean;
		/** Callback when an asset is selected (single select mode) */
		onSelect?: (asset: Asset) => void;
		/** Callback when multiple assets are selected (multi select mode) */
		/**
		 * Confirmed multi-selection, as the complete set of selected asset IDs —
		 * across every page, not just the visible one. Treat it as the desired
		 * final state: anything absent was deselected.
		 */
		onSelectMultiple?: (assetIds: string[]) => void;
		/** Filter to specific asset type */
		assetTypeFilter?: 'image' | 'file';
		/** Number of assets per page */
		pageSize?: number;
		/** Whether this tab is currently active (triggers refetch when becoming active) */
		active?: boolean;
		/** Asset IDs already in use (shown with a tick indicator) */
		existingAssetIds?: Set<string>;
		/**
		 * Asset to open on mount, addressed by id.
		 *
		 * Looked up on its own rather than searched for in the current page: a
		 * deep-linked asset is usually *not* on page 1 — that's why someone
		 * linked to it — so filtering the loaded list would silently do nothing
		 * for exactly the assets this exists to reach.
		 */
		assetId?: string | null;
		/**
		 * Fires when the open asset changes (null when the panel closes), so the
		 * host can reflect it in the URL. The component holds no opinion about
		 * routing; it only reports.
		 */
		onAssetOpen?: (assetId: string | null) => void;
	}

	let {
		selectable = false,
		multiSelect = false,
		onSelect,
		onSelectMultiple,
		assetTypeFilter,
		pageSize = 30,
		active = true,
		existingAssetIds,
		assetId = null,
		onAssetOpen
	}: Props = $props();

	// State
	let assetList = $state<Asset[]>([]);
	let loading = $state(false);
	let searchQuery = $state('');
	let viewMode = $state<'grid' | 'list'>('grid');
	let sortOrder = $state<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest');

	const perms = usePermissions();
	const canRead = $derived(perms.can('asset.read'));
	const canUpload = $derived(perms.can('asset.upload'));
	const canDeleteAssets = $derived(perms.can('asset.delete'));

	/**
	 * Set when the server answers a read with 403.
	 *
	 * Normally `canRead` already stops us before the request, and the sidebar
	 * hides the media area entirely — but the client's capability set is a copy
	 * resolved at load, so a role edited in another tab (or a stale session) can
	 * disagree with the server. Treat the server's answer as the truth and show
	 * the same empty state rather than a "Failed to fetch assets" error, which
	 * reads as a broken CMS instead of a permission boundary.
	 */
	let accessDenied = $state(false);
	const showAccessDenied = $derived(!canRead || accessDenied);

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
		/** Why it failed, shown next to the file. Absent unless `status` is 'failed'. */
		error?: string;
		/** 0–100 while uploading. */
		progress?: number;
	}

	/**
	 * How many files upload at once.
	 *
	 * Sequential uploads make a 20-image drop feel broken — each waits for the
	 * whole of the previous one. Unbounded parallelism is worse: browsers cap
	 * connections per host anyway, so the extra requests queue invisibly while
	 * every progress bar crawls at once and the server handles a burst it
	 * didn't ask for. A small fixed width keeps throughput up and progress
	 * legible.
	 */
	const UPLOAD_CONCURRENCY = 3;
	let uploadQueue = $state<UploadQueueItem[]>([]);
	/**
	 * The server's request body limit. Seeded with the built-in default and
	 * replaced by the value the assets endpoint reports, so a configured limit is
	 * respected without the number being duplicated here.
	 */
	let maxUploadBytes = $state(MAX_UPLOAD_BYTES);
	/**
	 * Whether the server offers direct-to-storage upload. Reported by the assets
	 * endpoint rather than inferred: it depends on the adapter, an encryption
	 * key, and an operator opt-in that implies bucket CORS nothing here can see.
	 */
	let directUpload = $state(false);
	/**
	 * The image pipeline the server is running, or null when it's off.
	 *
	 * Needed so a grid tile can request a derivative instead of the original.
	 * Reported by the server, never derived here: the config hash decides which
	 * files exist, and a client that computed a different one would request URLs
	 * that silently fall back to the full-size original.
	 */
	let imageConfig = $state<(ImageConfig & { configHash: string }) | null>(null);

	// Detail editing state
	let editFilename = $state('');
	let editTitle = $state('');
	let editDescription = $state('');
	let editAlt = $state('');
	let editCreditLine = $state('');
	let isSaving = $state(false);

	// Bulk selection state
	let selectMode = $state(false);
	let selectedIds = $state<Set<string>>(
		(() =>
			selectable && multiSelect && existingAssetIds ? new Set(existingAssetIds) : new Set())()
	);
	let isBulkDeleting = $state(false);

	// In selectable+multiSelect mode, always be in select mode
	const isSelectMode = $derived(selectMode || (selectable && multiSelect));

	function toggleSelectMode() {
		selectMode = !selectMode;
		if (!selectMode) {
			selectedIds = new Set();
		}
	}

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

	/**
	 * Monotonic id for the most recently *issued* asset fetch.
	 *
	 * Responses are not guaranteed to arrive in the order they were requested: a
	 * search for "a" and the search for "ab" typed 200ms later are two in-flight
	 * requests, and if the first is slower its results land last and win. The same
	 * applies to paging quickly, and to a refetch racing the initial load. Every
	 * fetch stamps itself, and only the newest is allowed to write state — an
	 * older response is read and discarded.
	 *
	 * Not `$state`: it's request bookkeeping, and nothing renders from it.
	 */
	let fetchGeneration = 0;

	// Fetch assets
	async function fetchAssets(page = currentPage) {
		// Don't ask for what we know we can't have — the request would only come
		// back 403 and surface as an error toast.
		if (!canRead) {
			assetList = [];
			loading = false;
			return;
		}
		const generation = ++fetchGeneration;
		loading = true;
		try {
			const offset = (page - 1) * pageSize;
			const result = await assets.list({
				assetType: assetTypeFilter,
				search: searchQuery || undefined,
				limit: pageSize,
				offset
			});

			if (generation !== fetchGeneration) return;

			if (result.success && result.data) {
				assetList = result.data;
				currentPage = page;
				if (result.pagination) {
					totalPages = result.pagination.totalPages;
					totalAssets = result.pagination.total;
				}
				// Adopt the server's actual limit rather than trusting the compiled-in
				// default, which is only correct until someone configures a different
				// one. Absent on an older server, in which case the default stands.
				if (typeof result.limits?.maxUploadBytes === 'number') {
					maxUploadBytes = result.limits.maxUploadBytes;
				}
				directUpload = result.limits?.directUpload === true;
				imageConfig = result.images ?? null;
				// Clear bulk selection on page change (but never in multi-select picker mode —
				// selection is initialised once at mount and only changed by user interaction)
				if (!(selectable && multiSelect)) {
					selectedIds = new Set();
				}
				// Fetch reference counts for this page
				fetchReferenceCounts(result.data.map((a) => a.id));
			}
		} catch (error) {
			if (generation !== fetchGeneration) return;
			if (error instanceof ApiError && error.status === 403) {
				accessDenied = true;
				assetList = [];
			} else {
				toast.error('Failed to fetch assets');
			}
		} finally {
			// Only the newest request owns the spinner. A superseded one clearing it
			// would show "no assets" while its replacement is still in flight.
			if (generation === fetchGeneration) loading = false;
		}
	}

	function goToPage(page: number) {
		if (page < 1 || page > totalPages || page === currentPage) return;
		fetchAssets(page);
	}

	// Fetch reference counts for current page of assets
	async function fetchReferenceCounts(assetIds: string[]) {
		if (assetIds.length === 0 || !canRead) return;
		try {
			const result = await assets.getReferenceCounts(assetIds);
			if (result.success && result.data) {
				referenceCounts = { ...referenceCounts, ...result.data };
			}
		} catch (error) {
			// A 403 here is already reported by the asset fetch that triggered it;
			// a second toast would just be noise.
			if (!(error instanceof ApiError && error.status === 403)) {
				toast.error('Failed to fetch reference counts');
			}
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
		} catch {
			toast.error('Failed to fetch asset references');
			selectedAssetRefs = [];
			selectedRefCount = 0;
		} finally {
			loadingRefs = false;
		}
	}

	// Sort assets client-side
	function isSystemAsset(asset: Asset): boolean {
		const metadata = asset.metadata as Record<string, unknown> | null | undefined;
		return (
			metadata?.system === true ||
			metadata?.fieldPath === 'user.image' ||
			metadata?.fieldPath === 'organization.metadata.logo'
		);
	}

	function sortAssets(list: Asset[]): Asset[] {
		const sorted = [...list];
		switch (sortOrder) {
			case 'newest':
				return sorted.sort(
					(a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
				);
			case 'oldest':
				return sorted.sort(
					(a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
				);
			case 'name-asc':
				return sorted.sort((a, b) => a.originalFilename.localeCompare(b.originalFilename));
			case 'name-desc':
				return sorted.sort((a, b) => b.originalFilename.localeCompare(a.originalFilename));
			default:
				return sorted;
		}
	}

	// Pinned assets (already in array) — separate from the main sorted list
	const pinnedAssets = $derived.by(() => {
		if (!(selectable && multiSelect && existingAssetIds && existingAssetIds.size > 0)) return [];
		return assetList.filter((a) => !isSystemAsset(a) && existingAssetIds!.has(a.id));
	});

	const sortedAssets = $derived.by(() => {
		const visibleAssets = assetList.filter((a) => !isSystemAsset(a));
		if (selectable && multiSelect && existingAssetIds && existingAssetIds.size > 0) {
			return sortAssets(visibleAssets.filter((a) => !existingAssetIds!.has(a.id)));
		}
		return sortAssets(visibleAssets);
	});

	// Bulk selection derived (must be after sortedAssets)
	const allSelected = $derived(
		sortedAssets.length > 0 && sortedAssets.every((a) => selectedIds.has(a.id))
	);

	/**
	 * Add or remove the *visible* assets, as a delta.
	 *
	 * Never assign the page as the whole set: in picker mode `selectedIds` spans
	 * pages (and `sortedAssets` excludes the already-selected, which appear as
	 * pinned), so replacing it would discard every selection not on screen —
	 * deleting those images from the field on confirm.
	 */
	function toggleSelectAll() {
		const next = new SvelteSet(selectedIds);
		if (allSelected) {
			for (const asset of sortedAssets) next.delete(asset.id);
		} else {
			for (const asset of sortedAssets) next.add(asset.id);
		}
		selectedIds = next;
	}

	function toggleSelect(id: string) {
		const next = new SvelteSet(selectedIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selectedIds = next;
	}

	/**
	 * Hand back the complete selected ID set — never a list of `Asset` objects.
	 *
	 * `selectedIds` is seeded from `existingAssetIds` and spans every page, but
	 * `assetList` only ever holds the current one. Resolving the selection through
	 * `assetList` therefore silently dropped every selected asset that wasn't on
	 * the visible page, and the consumer — which treats the result as the complete
	 * desired set — deleted them from the field.
	 *
	 * IDs are also all the consumer needs: it rebuilds items as `{ _ref: id }` and
	 * preserves per-item data (alt text, `_key`, order) from what it already holds.
	 */
	function confirmMultiSelect() {
		if (onSelectMultiple) {
			onSelectMultiple([...selectedIds]);
			selectedIds = new Set();
		}
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
		} catch {
			toast.error('Failed to check references');
		}

		// Check for referenced assets
		const referencedAssets = idsToCheck.filter((id) => (referenceCounts[id] || 0) > 0);
		if (referencedAssets.length > 0) {
			toast.error(
				`Cannot delete ${referencedAssets.length} asset${referencedAssets.length > 1 ? 's' : ''} — still referenced by documents. Remove the references first.`
			);
			return;
		}

		const count = selectedIds.size;
		const confirmed = await confirmDialog({
			title: `Delete ${count} asset${count > 1 ? 's' : ''}?`,
			description: 'This cannot be undone.',
			confirmText: 'Delete',
			variant: 'destructive'
		});
		if (!confirmed) return;

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
		} catch {
			toast.error('Failed to delete assets');
		} finally {
			isBulkDeleting = false;
		}
	}

	// Upload files via modal queue
	//
	// Oversized files are failed here rather than sent, because `File.size` is
	// known before a single byte goes over the wire. Uploading a 50MB file for
	// the length of the transfer only to be told it was never going to be
	// accepted is the worst version of this. Rejecting up front is purely a
	// courtesy though — the server enforces the same limit, since nothing stops
	// a caller posting straight to the API.
	function addFilesToQueue(files: FileList | null) {
		if (!files || files.length === 0) return;
		const fileLimit = maxUploadFileBytes(maxUploadBytes);
		const newItems: UploadQueueItem[] = Array.from(files).map((file) =>
			file.size > fileLimit
				? {
						file,
						status: 'failed' as const,
						error: `Too large — ${formatSize(file.size)}, limit is ${formatSize(fileLimit)}`
					}
				: { file, status: 'pending' as const }
		);
		uploadQueue = [...uploadQueue, ...newItems];
		processUploadQueue();
	}

	/** Upload one queued item, reporting progress as it goes. */
	async function uploadItem(index: number) {
		const item = uploadQueue[index];
		if (!item) return;

		item.status = 'uploading';
		item.progress = 0;
		item.error = undefined;
		uploadQueue = [...uploadQueue];

		try {
			await assets.uploadFile(item.file, {
				direct: directUpload,
				onProgress: (percent) => {
					item.progress = percent;
					uploadQueue = [...uploadQueue];
				}
			});
			item.status = 'done';
			item.progress = 100;
		} catch (err) {
			item.status = 'failed';
			item.error = uploadErrorMessage(err);
		}
		uploadQueue = [...uploadQueue];
	}

	async function processUploadQueue() {
		if (isUploading) return;
		isUploading = true;

		// A pool of workers pulling from the queue, rather than a fixed split:
		// files differ wildly in size, so slicing the queue into equal shares
		// would leave one worker on a 9MB photo while the others idle.
		const next = (): number => uploadQueue.findIndex((item) => item.status === 'pending');
		const worker = async () => {
			for (let i = next(); i !== -1; i = next()) {
				await uploadItem(i);
			}
		};
		await Promise.all(
			Array.from({ length: Math.min(UPLOAD_CONCURRENCY, uploadQueue.length) }, worker)
		);

		isUploading = false;

		// Auto-close only when everything actually succeeded.
		//
		// This used to close on `done || failed`, so a rejected upload dismissed
		// the modal exactly like a successful one and the failure was never read —
		// the most common cause being a file over the server's body limit, which
		// is precisely the case the editor needs told about.
		const allSucceeded = uploadQueue.every((item) => item.status === 'done');

		currentPage = 1;
		await fetchAssets(1);

		if (allSucceeded) {
			setTimeout(() => {
				showUploadModal = false;
				uploadQueue = [];
			}, 800);
		}
	}

	/**
	 * Re-queue a failed upload.
	 *
	 * The `File` is still held by the queue item, so this costs the editor
	 * nothing — the alternative was closing the dialog and picking the file
	 * again, which for a drag-and-drop of twenty images meant redoing the lot to
	 * retry one.
	 */
	function retryUpload(index: number) {
		const item = uploadQueue[index];
		if (!item || item.status !== 'failed') return;
		// Re-check the size: a failure caused by exceeding the limit is not worth
		// a round trip, and the limit may have been learned since.
		const fileLimit = maxUploadFileBytes(maxUploadBytes);
		if (item.file.size > fileLimit) {
			item.error = `Too large — ${formatSize(item.file.size)}, limit is ${formatSize(fileLimit)}`;
			uploadQueue = [...uploadQueue];
			return;
		}
		item.status = 'pending';
		item.error = undefined;
		uploadQueue = [...uploadQueue];
		processUploadQueue();
	}

	function retryAllFailed() {
		for (let i = 0; i < uploadQueue.length; i++) {
			const item = uploadQueue[i]!;
			if (item.status === 'failed' && item.file.size <= maxUploadFileBytes(maxUploadBytes)) {
				item.status = 'pending';
				item.error = undefined;
			}
		}
		uploadQueue = [...uploadQueue];
		processUploadQueue();
	}

	const failedCount = $derived(uploadQueue.filter((i) => i.status === 'failed').length);

	/**
	 * Turn a thrown upload error into something an editor can act on.
	 *
	 * The server's own message is preferred — it's the one that names the actual
	 * limit — with the status only used to fill in cases where the response
	 * carries no body, such as a proxy rejecting an oversized request before it
	 * ever reaches the app.
	 */
	function uploadErrorMessage(err: unknown): string {
		if (err instanceof ApiError) {
			const serverMessage = err.response?.error;
			if (typeof serverMessage === 'string' && serverMessage) return serverMessage;
			if (err.status === 413) return 'File is too large for this server’s upload limit';
			return `Upload failed (${err.status})`;
		}
		if (err instanceof Error && err.message) return err.message;
		return 'Upload failed';
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

	// Select an asset for detail view — re-fetch to get fresh data
	// Select an asset for detail view
	function openAssetDetail(asset: Asset) {
		const isSameAsset = selectedAsset?.id === asset.id;

		selectedAsset = asset;
		if (!isSameAsset) onAssetOpen?.(asset.id);
		editFilename = asset.originalFilename || '';
		editTitle = asset.title || '';
		editDescription = asset.description || '';
		editAlt = asset.alt || '';
		editCreditLine = asset.creditLine || '';

		// Only reset references/tab when switching to a different asset
		if (!isSameAsset) {
			detailTab = 'details';
			selectedAssetRefs = [];
			selectedRefCount = referenceCounts[asset.id] || 0;
		}
	}

	function closeAssetDetail() {
		selectedAsset = null;
		onAssetOpen?.(null);
	}

	/**
	 * Open the asset named by `assetId`, fetching it if it isn't already loaded.
	 *
	 * Runs once per distinct incoming id. It deliberately does not react to
	 * `selectedAsset` changing, or clicking a thumbnail would re-enter through
	 * the host's URL update and fight the user's selection.
	 */
	let resolvedDeepLink = $state<string | null>(null);

	$effect(() => {
		const wanted = assetId;
		if (!wanted || wanted === resolvedDeepLink || !canRead) return;
		resolvedDeepLink = wanted;
		if (selectedAsset?.id === wanted) return;

		const loaded = assetList.find((a) => a.id === wanted);
		if (loaded) {
			openAssetDetail(loaded);
			return;
		}

		void (async () => {
			try {
				const result = await assets.getById(wanted);
				if (result.success && result.data) openAssetDetail(result.data);
				else toast.error('That asset could not be found');
			} catch {
				// A bad id in a URL is a dead link, not a broken media browser —
				// the library behind it still loaded and is perfectly usable.
				toast.error('That asset could not be found');
			}
		})();
	});

	// Save metadata.
	//
	// Emptied fields are sent as `null`, not `undefined`: `JSON.stringify` drops
	// undefined keys from the body, so an omitted field reads on the server as
	// "leave this alone" — metadata could be added but never cleared. `null` is
	// the explicit "clear it" signal the PATCH route and adapters honour.
	async function saveMetadata() {
		if (!selectedAsset || !canUpload) return;
		isSaving = true;
		try {
			const result = await assets.update(selectedAsset.id, {
				// Renaming is metadata-only: the object is stored under the asset id,
				// so nothing moves and existing references keep resolving. Blank means
				// "unchanged" rather than "clear it" — an asset always has a name.
				originalFilename: editFilename.trim() || undefined,
				title: editTitle || null,
				description: editDescription || null,
				alt: editAlt || null,
				creditLine: editCreditLine || null
			});
			if (result.success && result.data) {
				// Update in list
				assetList = assetList.map((a) => (a.id === selectedAsset!.id ? result.data! : a));
				selectedAsset = result.data;
			}
		} catch {
			toast.error('Failed to save metadata');
		} finally {
			isSaving = false;
		}
	}

	// Delete asset.
	//
	// No client-side reference pre-check: the server scans unfiltered and is the
	// only authority. A local check would duplicate that scan, and it reads from
	// `referenceCounts`, which goes stale the moment a document changes (#233) —
	// blocking deletes that should succeed and permitting ones that shouldn't.
	async function deleteAsset(asset: Asset) {
		const confirmed = await confirmDialog({
			title: 'Delete asset?',
			description: `"${asset.originalFilename}" will be permanently deleted. This cannot be undone.`,
			confirmText: 'Delete',
			variant: 'destructive'
		});
		if (!confirmed) return;
		await performDelete(asset, false);
	}

	async function performDelete(asset: Asset, force: boolean) {
		try {
			const result = await assets.delete(asset.id, force ? { force: true } : undefined);
			if (result.success) {
				if (selectedAsset?.id === asset.id) {
					selectedAsset = null;
				}
				// Drop the cached count rather than leave it behind for an id that
				// no longer exists.
				const next = { ...referenceCounts };
				delete next[asset.id];
				referenceCounts = next;
				await fetchAssets();
			}
		} catch (error) {
			if (error instanceof ApiError && error.status === 409) {
				await handleDeleteConflict(asset, error.response as AssetDeleteConflict);
				return;
			}
			toast.error('Failed to delete asset');
		}
	}

	/**
	 * The asset is still referenced. The server has just done a fresh unfiltered
	 * scan, so treat its answer as the truth and correct the cached count with it.
	 *
	 * When any referencing document uses an unregistered schema type, force is the
	 * user's only route — that document cannot be opened in the admin, so the
	 * reference cannot be removed by hand and the asset would be undeletable.
	 */
	async function handleDeleteConflict(asset: Asset, conflict: AssetDeleteConflict) {
		const references = conflict.references ?? [];
		const unregisteredTypes = conflict.unregisteredTypes ?? [];
		referenceCounts = { ...referenceCounts, [asset.id]: references.length };

		if (unregisteredTypes.length === 0) {
			toast.error(conflict.error);
			return;
		}

		const blocking = references.filter((ref) => unregisteredTypes.includes(ref.type));
		const forced = await confirmDialog({
			title: 'Referenced by a document you cannot open',
			description:
				`"${asset.originalFilename}" is referenced by ${blocking.length} document${blocking.length > 1 ? 's' : ''} ` +
				`using schema type${unregisteredTypes.length > 1 ? 's' : ''} that ${unregisteredTypes.length > 1 ? 'are' : 'is'} no longer registered ` +
				`(${unregisteredTypes.join(', ')}). ${blocking.length > 1 ? 'Those documents' : 'That document'} cannot be opened in the admin, so the reference cannot be removed by hand. ` +
				`Re-registering the schema type would let you edit it. Force-deleting instead leaves a dangling reference that renders as a blank image.`,
			confirmText: 'Force delete',
			variant: 'destructive'
		});
		if (forced) {
			await performDelete(asset, true);
		}
	}

	// Copy URL state
	let copiedUrl = $state(false);

	let copiedId = $state(false);

	/**
	 * Copy the raw asset id.
	 *
	 * Not `copyUrlToClipboard`, which prefixes `window.location.origin` for a
	 * shareable link — correct for a URL and wrong for an id, which is pasted
	 * into a query, a seed, or an `{ asset: { _ref } }`, never into a browser.
	 */
	async function copyAssetId(asset: Asset) {
		try {
			await navigator.clipboard.writeText(asset.id);
			copiedId = true;
			toast.success('Asset ID copied');
			setTimeout(() => (copiedId = false), 2000);
		} catch {
			toast.error('Failed to copy asset ID');
		}
	}

	async function copyAssetUrl(asset: Asset) {
		const url = getOriginalUrl(asset);
		const success = await copyUrlToClipboard(url);
		if (success) {
			copiedUrl = true;
			setTimeout(() => (copiedUrl = false), 2000);
		}
	}

	function downloadAsset(asset: Asset) {
		downloadFile(getOriginalUrl(asset), asset.originalFilename);
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

	/**
	 * URL to draw an asset at tile size.
	 *
	 * Prefers the smallest derivative on the ladder. This grid used to render
	 * `asset.url` — the original — so a page of thirty photographs pulled thirty
	 * full-resolution files to fill thirty ~200px tiles. Nothing looked wrong,
	 * which is precisely why it went unnoticed.
	 *
	 * Falls back to the original when the pipeline is off or the asset can't be
	 * resized (SVG, animated): the variant route would serve the original for
	 * those anyway, and naming it directly saves a pointless redirect through a
	 * generation attempt.
	 */
	function getThumbnailUrl(asset: Asset): string {
		return variantUrlAt(asset, (config) => thumbnailWidth(config, asset.width ?? null));
	}

	/**
	 * The asset's own URL — the file that was uploaded, at full size.
	 *
	 * Distinct from {@link getThumbnailUrl} on purpose. Copying a URL and
	 * downloading a file both mean the *original*: handing someone a 320px webp
	 * when they asked for the asset is a data-loss-shaped bug, even though
	 * nothing errors.
	 */
	function getOriginalUrl(asset: Asset): string {
		return asset.url || `/media/${asset.id}/${asset.filename}`;
	}

	/**
	 * A derivative at the width `pick` chooses, or the original when the pipeline
	 * is off or the asset can't be resized (SVG, animated). The variant route
	 * serves the original for those anyway; naming it directly skips a pointless
	 * generation attempt.
	 */
	function variantUrlAt(asset: Asset, pick: (config: ImageConfig) => number): string {
		if (!imageConfig || !canGenerateVariants(asset)) return getOriginalUrl(asset);
		return buildVariantUrl(asset.id, pick(imageConfig), imageConfig.configHash);
	}

	/** Detail-pane preview: a panel-width rung, not a tile and not the original. */
	function getPreviewUrl(asset: Asset): string {
		return variantUrlAt(asset, (config) => {
			const widths = usableWidths(config, asset.width ?? null);
			return widths.find((w) => w >= 640) ?? widths[widths.length - 1]!;
		});
	}

	/**
	 * Lightbox: the largest rung, not the original.
	 *
	 * "Enlarge" on a 14MB photograph should not mean downloading 14MB — the top
	 * rung is already beyond any screen it will be shown on. `Download` is right
	 * there for anyone who wants the actual file.
	 */
	function getLightboxUrl(asset: Asset): string {
		return variantUrlAt(asset, (config) => {
			const widths = usableWidths(config, asset.width ?? null);
			return widths[widths.length - 1]!;
		});
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
		const orders: (typeof sortOrder)[] = ['newest', 'oldest', 'name-asc', 'name-desc'];
		const idx = orders.indexOf(sortOrder);
		sortOrder = orders[(idx + 1) % orders.length]!;
	}

	/**
	 * The org the current `assetList` was loaded for, and whether a load has been
	 * issued at all.
	 *
	 * `hasLoaded` is what makes the initial load explicit. Keying purely off
	 * "`orgId` changed" made the first load depend on the URL gaining an `orgId`
	 * that isn't there at mount: on a bare `/admin` the effect compared
	 * `null !== null`, was false, and never fetched. It happens to work today only
	 * because `OrganizationSwitcher` appends `orgId` via `replaceState` shortly
	 * after mount, which flips the comparison — an accident of another component's
	 * behaviour, not something this one should rely on.
	 *
	 * Neither is `$state`: they're written by the effect that reads them, so
	 * making them reactive would re-trigger it for no reason.
	 */
	let hasLoaded = false;
	let currentOrgId: string | null = null;

	// Previous value of `active`. `undefined` until the effect below has run once,
	// which lets that run seed rather than fire — the initial load belongs to the
	// org effect. Seeding it to `false` instead swallowed the *first* activation:
	// a browser mounted inactive never refetched when the user first switched to
	// it, so it showed whatever had been loaded at mount.
	let wasActive = $state<boolean | undefined>(undefined);

	// Load once on mount, and again whenever the org actually changes.
	$effect(() => {
		const orgId = page.url.searchParams.get('orgId');

		if (!hasLoaded) {
			hasLoaded = true;
			currentOrgId = orgId;
			fetchAssets(1);
			return;
		}

		// `null → id` is `OrganizationSwitcher` back-filling the URL just after
		// mount, not a switch. The list route scopes by the session's active
		// organization rather than this param, so the initial load already fetched
		// the right org — refetching here would be a duplicate round-trip on every
		// single mount. Adopt the id silently and wait for a real change.
		if (orgId === currentOrgId || currentOrgId === null) {
			currentOrgId = orgId;
			return;
		}

		currentOrgId = orgId;
		selectedAsset = null;
		currentPage = 1;
		fetchAssets(1);
	});

	// Refetch every time the tab becomes active.
	//
	// This is the only invalidation reference counts get (#233): they are fetched
	// solely as a follow-up to fetching a page of assets, and nothing signals the
	// media browser when a document edit adds or removes a reference. Re-entering
	// the tab is the moment the user expects to see the truth, so it must refetch
	// on *every* activation — including the first.
	$effect(() => {
		if (wasActive !== undefined && active && !wasActive) {
			selectedAsset = null;
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
		{#if canUpload}
			<Button
				size="sm"
				onclick={() => {
					showUploadModal = true;
					uploadQueue = [];
				}}
			>
				<Upload size={16} class="sm:mr-2" />
				<span class="hidden sm:inline">Upload assets</span>
			</Button>
		{/if}
	</div>

	<!-- Toolbar -->
	<div
		class="border-border flex flex-wrap items-center gap-2 border-b px-4 py-2 sm:gap-3 sm:px-6 sm:py-3"
	>
		<div class="relative min-w-0 flex-1 sm:w-48 sm:flex-none">
			<Search size={14} class="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2" />
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

		<!-- Select mode toggle — only useful when the user can actually act on
		     the selection (delete). Hidden otherwise so it doesn't dead-end. -->
		{#if !selectable && canDeleteAssets}
			<button
				onclick={toggleSelectMode}
				class="rounded p-1.5 transition-colors {isSelectMode
					? 'bg-primary text-primary-foreground'
					: 'text-muted-foreground hover:text-foreground'}"
				title={isSelectMode ? 'Exit select mode' : 'Select multiple'}
			>
				<SquareCheckBig size={14} />
			</button>
		{/if}

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
		<div class="min-h-0 flex-1 md:overflow-y-auto {selectedAsset ? 'hidden md:block' : ''}">
			<svelte:boundary
				onerror={(error) => cmsLogger.error('[MediaBrowser]', 'Render error:', error)}
			>
				{#if showAccessDenied}
					<div class="flex h-full flex-col items-center justify-center gap-4">
						<div class="bg-muted/50 flex h-16 w-16 items-center justify-center rounded-full">
							<Lock class="text-muted-foreground h-8 w-8" />
						</div>
						<div class="text-center">
							<h3 class="mb-1 font-medium">No access to media</h3>
							<p class="text-muted-foreground text-sm">
								Your role doesn't include permission to view assets.
							</p>
						</div>
					</div>
				{:else if loading && assetList.length === 0}
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
								{searchQuery
									? 'Try a different search term'
									: 'Upload your first asset to get started'}
							</p>
						</div>
					</div>
				{:else}
					<!-- Bulk action bar (shared for grid and list) -->
					{#if selectable && multiSelect}
						<div class="bg-muted border-border flex items-center gap-3 border-b px-4 py-2">
							<span class="text-sm font-medium">
								{selectedIds.size} selected
							</span>
							<Button variant="default" size="sm" onclick={confirmMultiSelect}>Done</Button>
						</div>
					{:else if selectedIds.size > 0}
						<div class="bg-muted border-border flex items-center gap-3 border-b px-4 py-2">
							<span class="text-sm font-medium">
								{selectedIds.size} selected
							</span>
							{#if canDeleteAssets}
								<Button
									variant="destructive"
									size="sm"
									onclick={bulkDelete}
									disabled={isBulkDeleting}
								>
									<Trash2 size={14} class="mr-1.5" />
									{isBulkDeleting ? 'Deleting...' : 'Delete'}
								</Button>
							{/if}
							<button
								onclick={() => (selectedIds = new Set())}
								class="text-muted-foreground hover:text-foreground text-sm transition-colors"
							>
								Clear selection
							</button>
						</div>
					{/if}
					{#if viewMode === 'grid'}
						<!-- Grid View -->
						<div class="grid grid-cols-2 gap-0.5 p-1 sm:grid-cols-5 xl:grid-cols-10">
							{#each pinnedAssets as asset (asset.id)}
								<button
									onclick={() => {
										if (selectable && multiSelect) {
											toggleSelect(asset.id);
										} else {
											openAssetDetail(asset);
										}
									}}
									class="group relative flex flex-col overflow-hidden rounded-sm transition-colors {selectedIds.has(
										asset.id
									)
										? 'ring-primary ring-2'
										: selectedAsset?.id === asset.id
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
										{#if isSelectMode && !selectable}
											<div class="absolute top-1.5 left-1.5">
												<Checkbox
													checked={selectedIds.has(asset.id)}
													onCheckedChange={() => toggleSelect(asset.id)}
													onclick={(e) => e.stopPropagation()}
												/>
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
							{#each sortedAssets as asset (asset.id)}
								<button
									onclick={() => {
										if (selectable && multiSelect) {
											toggleSelect(asset.id);
										} else if (isSelectMode) {
											toggleSelect(asset.id);
										} else {
											openAssetDetail(asset);
										}
									}}
									class="group relative flex flex-col overflow-hidden rounded-sm transition-colors {selectedIds.has(
										asset.id
									)
										? 'ring-primary ring-2'
										: selectedAsset?.id === asset.id
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
										{#if selectable}
											<div
												role="button"
												tabindex="0"
												onclick={(e) => {
													e.stopPropagation();
													openAssetDetail(asset);
												}}
												onkeydown={(e) => {
													if (e.key === 'Enter' || e.key === ' ') {
														e.preventDefault();
														e.stopPropagation();
														openAssetDetail(asset);
													}
												}}
												class="bg-background/80 absolute top-1.5 right-1.5 rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
												title="View details"
											>
												<svg
													class="h-3.5 w-3.5"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
													/>
												</svg>
											</div>
										{:else if isSelectMode}
											<!-- Checkbox overlay for bulk mode -->
											<div class="absolute top-1.5 left-1.5">
												<Checkbox
													checked={selectedIds.has(asset.id)}
													onCheckedChange={() => toggleSelect(asset.id)}
													onclick={(e) => e.stopPropagation()}
												/>
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
									class="hover:bg-muted rounded p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-30"
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
											class="min-w-[32px] rounded px-2 py-1 text-sm font-medium transition-colors {pg ===
											currentPage
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
									class="hover:bg-muted rounded p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-30"
								>
									<ChevronRight size={16} />
								</button>
							</div>
						{/if}
					{:else}
						<!-- List View -->
						<div class="w-full">
							<!-- Table header -->
							<div
								class="bg-muted/30 border-border text-muted-foreground hidden items-center gap-4 border-b px-4 py-2 text-xs font-medium tracking-wider uppercase md:grid md:grid-cols-[auto_40px_1fr_100px_100px_80px_50px_100px]"
							>
								<div class="w-4">
									<Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
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
							<div
								class="bg-muted/30 border-border text-muted-foreground flex items-center gap-3 border-b px-4 py-2 text-xs font-medium tracking-wider uppercase md:hidden"
							>
								<div class="w-4">
									<Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
								</div>
								<div>Assets</div>
							</div>
							{#each sortedAssets as asset (asset.id)}
								<!-- Desktop row -->
								<button
									onclick={() => {
										if (selectable && multiSelect) {
											openAssetDetail(asset);
										} else if (isSelectMode) {
											toggleSelect(asset.id);
										} else if (selectable && onSelect) {
											onSelect(asset);
										} else {
											openAssetDetail(asset);
										}
									}}
									class="border-border hidden w-full items-center gap-4 border-b px-4 py-2 text-left transition-colors md:grid md:grid-cols-[auto_40px_1fr_100px_100px_80px_50px_100px] {selectedAsset?.id ===
									asset.id
										? 'bg-muted'
										: selectedIds.has(asset.id)
											? 'bg-muted/70'
											: 'hover:bg-muted/50'}"
								>
									<div class="w-4">
										<Checkbox
											checked={selectedIds.has(asset.id)}
											onCheckedChange={() => toggleSelect(asset.id)}
											onclick={(e) => e.stopPropagation()}
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
									<div class="text-muted-foreground text-xs">
										{formatDate(asset.updatedAt || asset.createdAt)}
									</div>
								</button>
								<!-- Mobile row -->
								<button
									onclick={() => {
										if (selectable && multiSelect) {
											openAssetDetail(asset);
										} else if (isSelectMode) {
											toggleSelect(asset.id);
										} else if (selectable && onSelect) {
											onSelect(asset);
										} else {
											openAssetDetail(asset);
										}
									}}
									class="border-border flex w-full items-center gap-3 border-b px-4 py-2 text-left transition-colors md:hidden {selectedAsset?.id ===
									asset.id
										? 'bg-muted'
										: selectedIds.has(asset.id)
											? 'bg-muted/70'
											: 'hover:bg-muted/50'}"
								>
									<div class="w-4">
										<Checkbox
											checked={selectedIds.has(asset.id)}
											onCheckedChange={() => toggleSelect(asset.id)}
											onclick={(e) => e.stopPropagation()}
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
								<div
									class="border-border flex items-center justify-center gap-1 border-t px-4 py-3"
								>
									<button
										onclick={() => goToPage(currentPage - 1)}
										disabled={currentPage <= 1 || loading}
										class="hover:bg-muted rounded p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-30"
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
												class="min-w-[32px] rounded px-2 py-1 text-sm font-medium transition-colors {pg ===
												currentPage
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
										class="hover:bg-muted rounded p-1.5 transition-colors disabled:pointer-events-none disabled:opacity-30"
									>
										<ChevronRight size={16} />
									</button>
								</div>
							{/if}
						</div>
					{/if}
				{/if}

				{#snippet failed(error, reset)}
					<div class="border-destructive/30 bg-destructive/5 rounded-md border p-4 text-center">
						<p class="text-destructive font-medium">Media browser encountered an error</p>
						<p class="text-muted-foreground mt-1 text-sm">
							{error instanceof Error ? error.message : 'Unknown error'}
						</p>
						<button
							class="bg-primary text-primary-foreground mt-3 rounded px-4 py-2 text-sm"
							onclick={reset}
						>
							Retry
						</button>
					</div>
				{/snippet}
			</svelte:boundary>
		</div>

		<!-- Asset Detail Sidebar (extends page on mobile, side panel on desktop) -->
		{#if selectedAsset}
			<div
				class="bg-background border-border flex flex-col border-t md:w-[350px] md:shrink-0 md:overflow-y-auto md:border-t-0 md:border-l"
			>
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
					<p
						class="min-w-0 flex-1 truncate pl-2 text-sm font-medium md:pl-0"
						title={selectedAsset.originalFilename}
					>
						{selectedAsset.originalFilename}
					</p>
					<div class="flex items-center gap-1">
						{#if !selectable && canDeleteAssets}
							<Button
								variant="ghost"
								size="sm"
								class="h-7 w-7 p-0"
								onclick={() => deleteAsset(selectedAsset!)}
								title="Delete asset"
							>
								<Trash2 size={14} class="text-destructive" />
							</Button>
						{/if}
						<Button
							variant="ghost"
							size="sm"
							class="hidden h-7 w-7 p-0 md:flex"
							onclick={closeAssetDetail}
							title="Close"
						>
							<X size={14} />
						</Button>
					</div>
				</div>

				{#if selectable && !multiSelect && onSelect}
					<div class="border-border border-b px-4 py-2">
						<Button
							size="sm"
							class="w-full"
							onclick={() => {
								if (selectedAsset && onSelect) onSelect(selectedAsset);
							}}
						>
							Select
						</Button>
					</div>
				{/if}

				<!-- Preview (click to enlarge) -->
				<div class="p-4 pb-0">
					{#if isImage(selectedAsset)}
						<button
							onclick={() => (lightboxOpen = true)}
							class="bg-muted/30 mb-3 w-full cursor-zoom-in overflow-hidden rounded-lg"
							title="Click to enlarge"
						>
							<img
								src={getPreviewUrl(selectedAsset)}
								alt={selectedAsset.alt || selectedAsset.originalFilename}
								class="w-full object-contain"
								style="max-height: 200px;"
							/>
						</button>
					{:else}
						<div
							class="bg-muted/30 mb-3 flex h-28 items-center justify-center overflow-hidden rounded-lg"
						>
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
						class="flex-1 px-4 py-2.5 text-sm font-medium transition-colors {detailTab ===
						'references'
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
								<span
									class="max-w-[180px] truncate font-medium"
									title={selectedAsset.originalFilename}
								>
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
							<!-- The id is the asset's real identity: it's what a document
							     stores in `{ asset: { _ref } }`, what every storage key is
							     derived from, and the only stable handle when the filename
							     is editable. It was only ever readable by picking it out
							     of a copied URL. -->
							<div class="flex items-center justify-between gap-2">
								<span class="text-muted-foreground">Asset ID</span>
								<button
									onclick={() => copyAssetId(selectedAsset!)}
									title="{selectedAsset.id} — click to copy"
									class="hover:text-foreground max-w-[180px] cursor-pointer truncate font-mono text-xs"
								>
									{copiedId ? 'Copied!' : selectedAsset.id}
								</button>
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

						<!-- Metadata editing.
						     Gated on `asset.upload`, the capability the PATCH route
						     enforces. Presenting an editable form to a user who can't
						     save turned every keystroke into work discarded by a
						     generic 403 at the end. -->
						<div class="space-y-3">
							<div>
								<Label for="asset-filename" class="text-xs">Filename</Label>
								<Input
									id="asset-filename"
									bind:value={editFilename}
									readonly={!canUpload}
									disabled={!canUpload}
									class="mt-1 h-8 text-sm"
									placeholder="filename.jpg"
								/>
							</div>
							<div>
								<Label for="asset-title" class="text-xs">Title</Label>
								<Input
									id="asset-title"
									bind:value={editTitle}
									readonly={!canUpload}
									disabled={!canUpload}
									class="mt-1 h-8 text-sm"
									placeholder="Asset title"
								/>
							</div>
							<div>
								<Label for="asset-description" class="text-xs">Description</Label>
								<textarea
									id="asset-description"
									bind:value={editDescription}
									readonly={!canUpload}
									disabled={!canUpload}
									class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring mt-1 flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
									rows="2"
									placeholder="Description"
								></textarea>
							</div>
							<div>
								<Label for="asset-alt" class="text-xs">Alt text</Label>
								<Input
									id="asset-alt"
									bind:value={editAlt}
									readonly={!canUpload}
									disabled={!canUpload}
									class="mt-1 h-8 text-sm"
									placeholder="Alternative text"
								/>
							</div>
							<div>
								<Label for="asset-credit" class="text-xs">Credit line</Label>
								<Input
									id="asset-credit"
									bind:value={editCreditLine}
									readonly={!canUpload}
									disabled={!canUpload}
									class="mt-1 h-8 text-sm"
									placeholder="Credit / attribution"
								/>
							</div>

							{#if canUpload}
								<Button onclick={saveMetadata} disabled={isSaving} size="sm" class="w-full">
									{isSaving ? 'Saving...' : 'Save changes'}
								</Button>
							{:else}
								<p class="text-muted-foreground text-xs">
									You don't have permission to edit asset metadata.
								</p>
							{/if}
						</div>
					{:else}
						<!-- References tab -->
						{#if loadingRefs}
							<p class="text-muted-foreground text-sm">Loading references...</p>
						{:else if selectedAssetRefs.length === 0}
							<p class="text-muted-foreground text-sm">Not used in any documents</p>
						{:else}
							<div class="space-y-1">
								{#each selectedAssetRefs as ref (ref.documentId)}
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
		<Dialog.Content
			showCloseButton={false}
			class="!z-[10000] flex max-h-[90vh] max-w-[90vw] flex-col overflow-hidden p-0 sm:max-w-[90vw]"
			overlayClass="!z-[9999]"
		>
			<Dialog.Header class="border-border border-b px-4 py-3">
				<Dialog.Title class="truncate text-sm font-medium"
					>{selectedAsset.originalFilename}</Dialog.Title
				>
			</Dialog.Header>
			<div class="flex flex-1 items-center justify-center overflow-hidden p-4">
				<img
					src={getLightboxUrl(selectedAsset)}
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
<Dialog.Root
	bind:open={showUploadModal}
	onOpenChange={(v) => {
		if (!v && !isUploading) {
			showUploadModal = false;
		}
	}}
>
	<Dialog.Content class="!z-[10000] max-w-lg" overlayClass="!z-[9999]">
		<Dialog.Header>
			<Dialog.Title>Upload Assets</Dialog.Title>
		</Dialog.Header>

		<!-- Drop zone -->
		<div
			class="border-border mt-2 flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors {modalIsDragging
				? 'border-primary bg-primary/5'
				: 'hover:bg-muted/50'}"
			ondragover={(e) => {
				e.preventDefault();
				modalIsDragging = true;
			}}
			ondragleave={(e) => {
				e.preventDefault();
				modalIsDragging = false;
			}}
			ondrop={(e) => {
				e.preventDefault();
				modalIsDragging = false;
				addFilesToQueue(e.dataTransfer?.files || null);
			}}
			role="button"
			tabindex="0"
			onclick={() => modalFileInputRef?.click()}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') modalFileInputRef?.click();
			}}
		>
			<FileImage size={32} class="text-muted-foreground mb-3" />
			<p class="text-sm font-medium">
				{modalIsDragging ? 'Drop files here' : 'Drag and drop files here'}
			</p>
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
		{#if failedCount > 0 && !isUploading}
			<div class="mt-4 flex items-center justify-between gap-3">
				<p class="text-muted-foreground text-xs">
					{failedCount}
					{failedCount === 1 ? 'upload' : 'uploads'} failed
				</p>
				<Button variant="outline" size="sm" onclick={retryAllFailed}>Retry all</Button>
			</div>
		{/if}

		{#if uploadQueue.length > 0}
			<div class="mt-4 max-h-48 space-y-2 overflow-y-auto">
				{#each uploadQueue as item, index}
					<div
						class="border-border flex items-center gap-3 rounded-md border px-3 py-2 {item.status ===
						'failed'
							? 'border-destructive/50'
							: ''}"
					>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm">{item.file.name}</p>
							{#if item.status === 'failed' && item.error}
								<p class="text-destructive text-xs">{item.error}</p>
							{:else if item.status === 'uploading'}
								<div class="mt-1 flex items-center gap-2">
									<div class="bg-muted h-1 flex-1 overflow-hidden rounded-full">
										<div
											class="bg-primary h-full transition-[width] duration-150"
											style="width: {item.progress ?? 0}%"
										></div>
									</div>
									<span class="text-muted-foreground w-9 text-right text-xs tabular-nums">
										{item.progress ?? 0}%
									</span>
								</div>
							{:else}
								<p class="text-muted-foreground text-xs">{formatSize(item.file.size)}</p>
							{/if}
						</div>
						{#if item.status === 'uploading'}
							<div
								class="border-primary h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-t-transparent"
							></div>
						{:else if item.status === 'done'}
							<CheckCircle2 size={16} class="shrink-0 text-green-500" />
						{:else if item.status === 'failed'}
							<div class="flex shrink-0 items-center gap-1">
								<AlertCircle size={16} class="text-destructive" />
								<Button
									variant="ghost"
									size="sm"
									class="h-6 px-2 text-xs"
									onclick={() => retryUpload(index)}
								>
									Retry
								</Button>
							</div>
						{:else}
							<div class="bg-muted h-4 w-4 shrink-0 rounded-full"></div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
