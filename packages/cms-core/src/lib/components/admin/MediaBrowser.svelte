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
		Film,
		Music,
		FileArchive,
		Play,
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
	import type {
		AssetDeleteConflict,
		BulkAssetDeleteConflict,
		AssetReference
	} from '../../api/assets';
	import type { Asset } from '../../types/asset';
	import { toast } from 'svelte-sonner';
	import { copyUrlToClipboard, downloadFile } from '../../utils/asset-actions';
	import { cmsLogger } from '../../utils/logger';
	import { extractVideoInfo, extractVideoInfoFromUrl } from '../../utils/video-metadata';
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
		/**
		 * The field this browser was opened from, when it was opened as a picker.
		 *
		 * Recorded on anything uploaded here, because it is what the media route
		 * later reads to decide whether the asset is private: privacy is declared
		 * on the field (`private: true`), and resolved from the field an asset was
		 * uploaded into. Without it, everything uploaded through the library is
		 * public regardless of where it is used — which was the case for every
		 * library upload until now.
		 *
		 * Absent when the library is opened as a destination in its own right (the
		 * Media tab), where there is no field to inherit from.
		 */
		schemaType?: string;
		fieldPath?: string;
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
		onAssetOpen,
		schemaType,
		fieldPath
	}: Props = $props();

	// State
	let assetList = $state<Asset[]>([]);
	let loading = $state(false);
	let searchQuery = $state('');
	/**
	 * How the library is displayed. These are per-editor habits rather than app
	 * state, so they're remembered per browser — resetting someone's view on every
	 * visit is a small daily annoyance. Storage can be unavailable or throw (a
	 * private window, blocked site data), and the defaults are correct when it is.
	 */
	type GridDensity = 'compact' | 'default' | 'large';
	type ViewMode = 'grid' | 'list';
	type SortOrder = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

	/**
	 * Tile track minimums. The grid was laid out on a fixed `xl:grid-cols-10`,
	 * which on a wide screen produced ~90px thumbnails — a contact sheet you can
	 * count but not read. Sizing tracks by a minimum width instead lets the column
	 * count follow the space actually available (opening the inspector reflows it).
	 */
	const TILE_MIN_WIDTH: Record<GridDensity, number> = {
		compact: 110,
		default: 165,
		large: 240
	};

	const STORAGE_KEYS = {
		density: 'aphex:media:density',
		view: 'aphex:media:view',
		sort: 'aphex:media:sort'
	} as const;

	function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
		if (typeof localStorage === 'undefined') return fallback;
		try {
			const stored = localStorage.getItem(key) as T | null;
			return stored !== null && allowed.includes(stored) ? stored : fallback;
		} catch {
			return fallback;
		}
	}

	function writeStored(key: string, value: string) {
		try {
			localStorage.setItem(key, value);
		} catch {
			/* not persisted */
		}
	}

	/**
	 * Media-kind filter, applied in SQL. Not persisted: unlike a view preference,
	 * a filter changes *which* assets exist as far as the editor can tell, and
	 * silently restoring one from a previous session reads as missing data.
	 */
	type CategoryFilter = 'all' | 'image' | 'svg' | 'video' | 'audio' | 'document';
	let categoryFilter = $state<CategoryFilter>('all');

	/**
	 * Used / unused, answered by the asset-reference index. Not persisted, for the
	 * same reason as the kind filter: a restored filter reads as missing data.
	 */
	type UsageFilter = 'all' | 'in-use' | 'unused';
	let usageFilter = $state<UsageFilter>('all');

	/**
	 * The server is still building the reference index for this org, so usage
	 * answers aren't trustworthy yet. Worth saying out loud: an unbuilt index makes
	 * every asset look unused, and "unused" is the answer that invites deletion.
	 */
	let usageIndexing = $state(false);

	let viewMode = $state<ViewMode>(readStored(STORAGE_KEYS.view, ['grid', 'list'], 'grid'));
	let sortOrder = $state<SortOrder>(
		readStored(STORAGE_KEYS.sort, ['newest', 'oldest', 'name-asc', 'name-desc'], 'newest')
	);
	let gridDensity = $state<GridDensity>(
		readStored(STORAGE_KEYS.density, ['compact', 'default', 'large'], 'default')
	);

	$effect(() => writeStored(STORAGE_KEYS.view, viewMode));
	$effect(() => writeStored(STORAGE_KEYS.sort, sortOrder));
	$effect(() => writeStored(STORAGE_KEYS.density, gridDensity));

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
	let showUploadModal = $state(false);
	let modalFileInputRef: HTMLInputElement;
	// Same enter/leave counter as the browser region — see the note by
	// `handleDragEnter`. This zone has no children to cross, but a drag that ends
	// outside the window still strands the highlight without it.
	let modalDragDepth = $state(0);
	const modalIsDragging = $derived(modalDragDepth > 0);

	interface UploadQueueItem {
		file: File;
		status: 'pending' | 'uploading' | 'done' | 'failed';
		/** Why it failed, shown next to the file. Absent unless `status` is 'failed'. */
		error?: string;
		/** 0–100 while uploading. */
		progress?: number;
		/**
		 * Object URL for an image preview, so a failed row can be identified by
		 * sight rather than by filename. Revoked when the queue is cleared —
		 * object URLs live until the document unloads otherwise.
		 */
		previewUrl?: string;
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

	/**
	 * Whether the metadata form differs from the asset it was loaded from.
	 *
	 * Drives both the Save button's enabled state and the guard when switching
	 * assets. Compared against `selectedAsset` rather than a snapshot taken at
	 * open, so a successful save — which replaces `selectedAsset` with the
	 * server's row — settles back to clean without any extra bookkeeping.
	 *
	 * `?? ''` on both sides: the columns are nullable, the inputs are not, so a
	 * null title and an untouched empty input are the same thing.
	 */
	const metadataDirty = $derived(
		!!selectedAsset &&
			(editFilename.trim() !== (selectedAsset.originalFilename ?? '') ||
				editTitle !== (selectedAsset.title ?? '') ||
				editDescription !== (selectedAsset.description ?? '') ||
				editAlt !== (selectedAsset.alt ?? '') ||
				editCreditLine !== (selectedAsset.creditLine ?? ''))
	);

	// Bulk selection state
	let selectMode = $state(false);
	let selectedIds = $state<Set<string>>(
		(() =>
			selectable && multiSelect && existingAssetIds ? new Set(existingAssetIds) : new Set())()
	);
	let isBulkDeleting = $state(false);

	/**
	 * The asset a shift-click extends *from* — the last one whose selection the
	 * user set directly.
	 *
	 * Held as an id rather than an index because the list underneath it moves:
	 * sorting, searching and paging all reorder `orderedAssets`, and an index
	 * would then point at a different asset than the one that was clicked.
	 */
	let selectionAnchor = $state<string | null>(null);

	/**
	 * Which way the anchor click went — `true` if it selected, `false` if it
	 * deselected. A shift-click repeats it across the range.
	 *
	 * Recorded rather than read back off the anchor at shift-click time: by then
	 * the anchor may have been re-toggled by a checkbox or swept by select-all,
	 * and the range would silently invert.
	 */
	let anchorSelects = $state(true);

	/**
	 * Whether select mode was asked for, as opposed to entered by ticking a
	 * checkbox.
	 *
	 * Only used to decide whether emptying the selection should also leave the
	 * mode: an implicit entry should undo itself, so unticking the last checkbox
	 * puts the grid back to "click opens the asset". A deliberate entry stays put
	 * — the user pressed a button, and having it silently pop back off the first
	 * time they cleared a selection would be its own bug.
	 */
	let selectModeExplicit = $state(false);

	// In selectable+multiSelect mode, always be in select mode
	const isSelectMode = $derived(selectMode || (selectable && multiSelect));

	function toggleSelectMode() {
		selectMode = !selectMode;
		selectModeExplicit = selectMode;
		if (!selectMode) {
			selectedIds = new Set();
			selectionAnchor = null;
		}
	}

	/**
	 * Keep the mode in step with the selection.
	 *
	 * The list view's checkboxes are always rendered, so a user can start
	 * selecting without ever finding the toolbar's select-mode button — and until
	 * this existed, doing so ticked boxes that produced no action bar and no way
	 * to delete anything. Selecting something *is* the request to be in select
	 * mode.
	 */
	function syncSelectMode() {
		if (selectable) return; // picker mode is permanently in select mode
		if (selectedIds.size > 0) {
			selectMode = true;
		} else if (!selectModeExplicit) {
			selectMode = false;
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
				category: categoryFilter === 'all' ? undefined : categoryFilter,
				usage: usageFilter === 'all' ? undefined : usageFilter,
				search: searchQuery || undefined,
				sort: sortOrder,
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
				usageIndexing = (result as { indexing?: boolean }).indexing === true;

				// Deliberately not awaited: posters are a nicety, and the grid should be
				// on screen while they fill in behind it.
				void backfillPosters(
					assetList.filter(
						(asset) =>
							(isVideo(asset) && !getPosterUrl(asset)) || (isAudio(asset) && !formatDuration(asset))
					)
				);
				imageConfig = result.images ?? null;
				// Clear bulk selection on page change (but never in multi-select picker mode —
				// selection is initialised once at mount and only changed by user interaction)
				if (!(selectable && multiSelect)) {
					selectedIds = new Set();
					syncSelectMode();
				}
				// The anchor always dies with the page: it names an asset that may no
				// longer be rendered, and extending a range from off-screen produces a
				// selection the user cannot see the ends of.
				selectionAnchor = null;
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

	function isSystemAsset(asset: Asset): boolean {
		const metadata = asset.metadata as Record<string, unknown> | null | undefined;
		return (
			metadata?.system === true ||
			metadata?.fieldPath === 'user.image' ||
			metadata?.fieldPath === 'organization.metadata.logo'
		);
	}

	// Pinned assets (already in array) — separate from the main sorted list
	const pinnedAssets = $derived.by(() => {
		if (!(selectable && multiSelect && existingAssetIds && existingAssetIds.size > 0)) return [];
		return assetList.filter((a) => !isSystemAsset(a) && existingAssetIds!.has(a.id));
	});

	/**
	 * The page as the server ordered it, minus the system assets and (in picker
	 * mode) the ones shown as pinned.
	 *
	 * Deliberately does not re-sort. It used to, and that sort only ever saw the
	 * loaded page: "Name: A–Z" across 300 assets alphabetised whichever 30 rows
	 * happened to be in `assetList`, so the first page showed the A's from the
	 * newest 30 uploads rather than the A's from the library. It looked sorted,
	 * which is why it survived this long. `sort` is a query parameter now.
	 */
	const sortedAssets = $derived.by(() => {
		const visibleAssets = assetList.filter((a) => !isSystemAsset(a));
		if (selectable && multiSelect && existingAssetIds && existingAssetIds.size > 0) {
			return visibleAssets.filter((a) => !existingAssetIds!.has(a.id));
		}
		return visibleAssets;
	});

	/**
	 * Every visible asset, in the order it renders: pinned first, then the sorted
	 * page.
	 *
	 * Range selection needs one flat order that both views agree on, because
	 * "everything between these two" is meaningless against a list the user isn't
	 * looking at. It's also the honest answer for select-all: `sortedAssets`
	 * excludes the pinned ones in picker mode, so a select-all built on it could
	 * add every visible asset but never clear the pinned ones back off.
	 */
	const orderedAssets = $derived([...pinnedAssets, ...sortedAssets]);

	// Bulk selection derived (must be after orderedAssets)
	const allSelected = $derived(
		orderedAssets.length > 0 && orderedAssets.every((a) => selectedIds.has(a.id))
	);

	/**
	 * Add or remove the *visible* assets, as a delta.
	 *
	 * Never assign the page as the whole set: in picker mode `selectedIds` spans
	 * pages, so replacing it would discard every selection not on screen —
	 * deleting those images from the field on confirm.
	 */
	function toggleSelectAll() {
		const next = new SvelteSet(selectedIds);
		if (allSelected) {
			for (const asset of orderedAssets) next.delete(asset.id);
		} else {
			for (const asset of orderedAssets) next.add(asset.id);
		}
		selectedIds = next;
		selectionAnchor = null;
		syncSelectMode();
	}

	function toggleSelect(id: string) {
		const next = new SvelteSet(selectedIds);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		selectedIds = next;
		syncSelectMode();
	}

	/**
	 * Apply the anchor's own outcome to everything between it and `id`, inclusive.
	 *
	 * The range doesn't always *select*: it repeats whatever the anchor click did.
	 * Ticking one asset and shift-clicking ten below it selects eleven; unticking
	 * one and shift-clicking ten below it clears eleven. Deselecting a range is
	 * the only practical way to undo an overshoot on a hundred-item page, and
	 * making the gesture mean "select" in both directions would leave the
	 * correction to a hundred individual clicks.
	 *
	 * Only the assets between the two ends are touched, so a picker-mode
	 * selection that spans other pages survives either direction.
	 *
	 * The anchor deliberately stays put afterwards, so a second shift-click
	 * re-extends from the same origin instead of chaining off the previous target.
	 * That's what makes "oops, one too far" a correction rather than a restart.
	 */
	function selectRange(id: string) {
		const to = orderedAssets.findIndex((a) => a.id === id);
		if (to === -1) return;

		// No anchor yet — a shift-click is the first click. Nothing to extend
		// from, so treat it as an ordinary one rather than doing nothing.
		const from = selectionAnchor ? orderedAssets.findIndex((a) => a.id === selectionAnchor) : -1;
		if (from === -1) {
			setAnchor(id);
			return;
		}

		const [start, end] = from < to ? [from, to] : [to, from];
		const next = new SvelteSet(selectedIds);
		for (let i = start; i <= end; i++) {
			const rangeId = orderedAssets[i]!.id;
			if (anchorSelects) next.add(rangeId);
			else next.delete(rangeId);
		}
		selectedIds = next;
		syncSelectMode();
	}

	/**
	 * Toggle `id` and make it the anchor, recording which way it went so a
	 * following shift-click can repeat it.
	 */
	function setAnchor(id: string) {
		anchorSelects = !selectedIds.has(id);
		toggleSelect(id);
		selectionAnchor = id;
	}

	/**
	 * The single entry point for "the user clicked this asset to select it".
	 *
	 * Every tile, row and checkbox routes through here so the anchor is
	 * maintained in one place — a path that toggles without moving the anchor
	 * leaves shift-click extending from an asset the user stopped thinking about
	 * several clicks ago.
	 */
	function handleSelectClick(id: string, event: { shiftKey: boolean }) {
		if (event.shiftKey) {
			selectRange(id);
			return;
		}
		setAnchor(id);
	}

	function clearSelection() {
		selectedIds = new Set();
		selectionAnchor = null;
		syncSelectMode();
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
			clearSelection();
		}
	}

	async function bulkDelete() {
		if (selectedIds.size === 0) return;

		// No client-side reference pre-check.
		//
		// There used to be one, and it disagreed with the server in the one case
		// that matters. It counted references via `getReferenceCounts`, which
		// filters to *registered* schema types; the server's delete guard scans
		// unfiltered, because a document whose type was removed from the codebase
		// still holds its reference. So an asset blocked only by an orphaned type
		// passed the client check, hit the server, and came back 409 — with the
		// client insisting nothing referenced it. Asking two different questions
		// and treating them as one answer is the bug.
		//
		// The server does a fresh authoritative scan on every attempt, so it is the
		// only sensible authority. Attempt the delete and handle its refusal.
		const count = selectedIds.size;
		const confirmed = await confirmDialog({
			title: `Delete ${count} asset${count > 1 ? 's' : ''}?`,
			description: 'This cannot be undone.',
			confirmText: 'Delete',
			variant: 'destructive'
		});
		if (!confirmed) return;

		await performBulkDelete([...selectedIds], false);
	}

	async function performBulkDelete(ids: string[], force: boolean) {
		isBulkDeleting = true;
		try {
			const result = await assets.deleteBulk(ids, force ? { force: true } : undefined);
			if (result.success) {
				if (selectedAsset && ids.includes(selectedAsset.id)) {
					selectedAsset = null;
				}
				clearSelection();
				await fetchAssets();
			}
		} catch (err) {
			if (err instanceof ApiError && err.status === 409) {
				await handleBulkDeleteConflict(ids, err.response as BulkAssetDeleteConflict);
				return;
			}
			toast.error('Failed to delete assets');
		} finally {
			isBulkDeleting = false;
		}
	}

	/**
	 * The batch was refused. Mirrors {@link handleDeleteConflict}: offer force only
	 * when an unregistered schema type is what's blocking, because that is the case
	 * where removing the reference by hand is impossible.
	 */
	async function handleBulkDeleteConflict(ids: string[], conflict: BulkAssetDeleteConflict) {
		const blocked = conflict.referencedIds ?? [];
		const unregisteredTypes = conflict.unregisteredTypes ?? [];

		// The server just told us these are referenced; correct the cached counts so
		// the grid stops showing them as unused before the next fetch.
		const corrected = { ...referenceCounts };
		for (const id of blocked) corrected[id] = Math.max(corrected[id] ?? 0, 1);
		referenceCounts = corrected;

		if (unregisteredTypes.length === 0) {
			toast.error(conflict.error);
			return;
		}

		const forced = await confirmDialog({
			title: 'Referenced by documents you cannot open',
			// Two sentences: what's blocking, and what the button does. The rest —
			// which plane gets cleaned, when a published page catches up — is true
			// but belongs in the docs, not in front of someone mid-cleanup.
			description:
				`${blocked.length} asset${blocked.length > 1 ? 's are' : ' is'} used by documents of type ${unregisteredTypes.join(', ')}, which no longer ${unregisteredTypes.length > 1 ? 'exist' : 'exists'} in your schema. ` +
				`Force delete removes the references for you.`,
			confirmText: 'Force delete',
			variant: 'destructive'
		});
		if (forced) {
			await performBulkDelete(ids, true);
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
		const newItems: UploadQueueItem[] = Array.from(files).map((file) => {
			const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
			return file.size > fileLimit
				? {
						file,
						previewUrl,
						status: 'failed' as const,
						error: `Too large — ${formatSize(file.size)}, limit is ${formatSize(fileLimit)}`
					}
				: { file, previewUrl, status: 'pending' as const };
		});
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
			// Read duration, real dimensions and a frame off the local file before it
			// goes anywhere. Only possible here: once uploaded, the same work would
			// mean fetching the video back, and the server has no decoder without
			// taking on ffmpeg.
			const videoInfo = await extractVideoInfo(item.file);

			const result = await assets.uploadFile(item.file, {
				direct: directUpload,
				// Absent for a plain Media-tab upload; see the prop docs.
				schemaType,
				fieldPath,
				videoDuration: videoInfo.duration,
				videoWidth: videoInfo.width,
				videoHeight: videoInfo.height,
				onProgress: (percent) => {
					item.progress = percent;
					uploadQueue = [...uploadQueue];
				}
			});

			// The poster is a second request because its storage key derives from the
			// asset id, which doesn't exist until the row does. Deliberately not
			// awaited into the upload's own success: a video that uploaded fine has
			// uploaded fine, and losing its thumbnail must not report as a failure.
			const uploadedId = result?.data?.id;
			if (uploadedId && videoInfo.poster) {
				try {
					await assets.uploadPoster(uploadedId, videoInfo.poster, {
						duration: videoInfo.duration,
						width: videoInfo.width,
						height: videoInfo.height
					});
				} catch (err) {
					cmsLogger.warn('[Media]', 'Poster upload failed; video is fine:', err);
				}
			}

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

		// The dialog stays open when the queue drains, and the editor dismisses it.
		//
		// It used to close itself 800ms after a fully successful run (and, before
		// that, on `done || failed`, so a rejected upload dismissed the modal
		// exactly like a successful one and the failure was never read). Even
		// limited to the all-succeeded case, closing on a timer takes the result
		// away just as it appears — and on a slow backend a large video upload is
		// precisely when someone wants to see it land. Staying open also keeps the
		// drop zone available for the next batch.
		currentPage = 1;
		await fetchAssets(1);
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
	const queuedBytes = $derived(uploadQueue.reduce((total, item) => total + item.file.size, 0));

	/** Empty the queue, releasing the preview object URLs it holds. */
	function clearUploadQueue() {
		for (const item of uploadQueue) {
			if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
		}
		uploadQueue = [];
	}

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
	//
	// `dragleave` fires whenever the pointer crosses onto a *child* element, not
	// only when it leaves the region — and the grid is nothing but children. So
	// toggling a boolean on enter/leave switched the overlay off every time the
	// cursor moved between tiles, and `dragover` immediately switched it back on:
	// the flashing.
	//
	// The counter is the fix for that. Enter and leave arrive in pairs as the drag
	// crosses each boundary, so the depth only reaches zero when the drag has
	// genuinely left the region.
	let dragDepth = $state(0);
	const isDragging = $derived(dragDepth > 0);

	/**
	 * Ignore drags that aren't files.
	 *
	 * Dragging a text selection, or one of the grid's own tiles, would otherwise
	 * put a "Drop files to upload" overlay over the page for a drop that can
	 * produce nothing.
	 */
	function isFileDrag(e: DragEvent): boolean {
		const types = e.dataTransfer?.types;
		return types ? Array.from(types).includes('Files') : false;
	}

	function handleDragEnter(e: DragEvent) {
		if (!isFileDrag(e)) return;
		e.preventDefault();
		dragDepth++;
	}

	function handleDragOver(e: DragEvent) {
		if (!isFileDrag(e)) return;
		// Required on every dragover, or the browser treats the region as a
		// non-target and shows the "no drop" cursor.
		e.preventDefault();
	}

	function handleDragLeave(e: DragEvent) {
		if (dragDepth === 0) return;
		e.preventDefault();
		dragDepth--;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragDepth = 0;
		if (!e.dataTransfer?.files?.length) return;
		showUploadModal = true;
		addFilesToQueue(e.dataTransfer.files);
	}

	/**
	 * A drag that ends outside the window — dropped on the desktop, or cancelled
	 * with Escape — delivers no `dragleave` to us, so the counter would stay above
	 * zero and strand the overlay on screen until the next drag.
	 */
	function handleDragEnd() {
		dragDepth = 0;
	}

	/**
	 * Ask before throwing away metadata edits.
	 *
	 * Everything that replaces or closes the detail panel goes through here.
	 * Without it, typing alt text and then clicking the next thumbnail — the
	 * natural rhythm of captioning a shoot — discarded the text silently, with
	 * the panel that appeared next looking exactly like a successful save.
	 */
	async function confirmDiscardEdits(): Promise<boolean> {
		if (!metadataDirty) return true;
		return confirmDialog({
			title: 'Discard unsaved changes?',
			description: 'The metadata you edited on this asset has not been saved.',
			confirmText: 'Discard',
			variant: 'destructive'
		});
	}

	// Select an asset for detail view — re-fetch to get fresh data
	// Select an asset for detail view
	async function openAssetDetail(asset: Asset) {
		const isSameAsset = selectedAsset?.id === asset.id;
		if (!isSameAsset && !(await confirmDiscardEdits())) return;

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

	async function closeAssetDetail() {
		if (!(await confirmDiscardEdits())) return;
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
				if (result.success && result.data) await openAssetDetail(result.data);
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
			// See the bulk dialog: what's blocking, then what the button does.
			description:
				`"${asset.originalFilename}" is used by ${blocking.length} document${blocking.length > 1 ? 's' : ''} of type ${unregisteredTypes.join(', ')}, which no longer ${unregisteredTypes.length > 1 ? 'exist' : 'exists'} in your schema. ` +
				`Force delete removes the reference${blocking.length > 1 ? 's' : ''} for you.`,
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

	/**
	 * Secondary line on a grid tile: `PNG · 2.4 MB`, with dimensions when known.
	 * The filename alone rarely distinguishes two crops of the same photo, which
	 * is the case where a contact-sheet grid is least useful.
	 */
	function assetMetaLine(asset: Asset): string {
		const kind = (asset.mimeType?.split('/')[1] ?? '').toUpperCase();
		const dimensions = asset.width && asset.height ? `${asset.width}×${asset.height}` : null;
		return [kind || null, dimensions, formatSize(asset.size)].filter(Boolean).join(' · ');
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
	/**
	 * A video's poster frame, when one was extracted at upload.
	 *
	 * Gated on the recorded flag rather than optimistically requesting the URL: a
	 * video without a poster answers 404, and a grid of broken <img> is worse than
	 * a grid of honest placeholder icons.
	 */
	let generatingPoster = $state(false);

	/**
	 * Videos whose poster we have already tried to produce this session.
	 *
	 * Without it a video the browser cannot decode is retried on every render:
	 * failure leaves no poster, an absent poster is the trigger, and the loop
	 * costs a fetch and a decode attempt each time round.
	 */
	const posterAttempts = new SvelteSet<string>();

	/**
	 * Fill in posters for videos that have none.
	 *
	 * Automatic rather than a button, because "this video has no thumbnail" is not
	 * a decision an editor should have to make — it is just an asset uploaded
	 * before posters existed, or through the API where no browser saw the file.
	 *
	 * Only a browser can do this (see `video-metadata.ts`), so it happens here
	 * rather than in a job. Three deliberate limits: only assets on the page in
	 * front of the user, one at a time, and never the same asset twice — each
	 * fetches part of a video and runs a decode, and thirty of those at once would
	 * make opening the media library expensive.
	 */
	async function backfillPosters(candidates: Asset[]) {
		for (const asset of candidates) {
			if (posterAttempts.has(asset.id)) continue;
			posterAttempts.add(asset.id);
			try {
				const info = await extractVideoInfoFromUrl(getOriginalUrl(asset));
				// Audio yields a duration and no frame, which is still worth storing —
				// a WAV's length is exactly what the grid has no other way to show.
				if (!info.poster && info.duration == null) continue;
				await assets.uploadPoster(asset.id, info.poster, {
					duration: info.duration,
					width: info.width,
					height: info.height
				});
				// Patch in place rather than refetching the page: a background task
				// must not move the grid under someone mid-click.
				assetList = assetList.map((item) =>
					item.id === asset.id
						? {
								...item,
								width: info.width ?? item.width,
								height: info.height ?? item.height,
								metadata: {
									...(item.metadata ?? {}),
									poster: true,
									duration: info.duration ?? item.metadata?.duration
								}
							}
						: item
				);
			} catch (err) {
				cmsLogger.debug('[Media]', 'Poster backfill skipped for', asset.id, err);
			}
		}
	}

	/**
	 * Produce a poster for a video that has none — one uploaded before posters
	 * existed, or through the API where no browser saw the file.
	 *
	 * Cheap only because the media route serves byte ranges: the browser fetches
	 * the container header and the frames around the seek point rather than the
	 * whole video.
	 */
	async function generatePoster(asset: Asset) {
		generatingPoster = true;
		try {
			const info = await extractVideoInfoFromUrl(getOriginalUrl(asset));
			if (!info.poster) {
				toast.error('Could not read a frame — this browser may not decode that codec');
				return;
			}
			await assets.uploadPoster(asset.id, info.poster, {
				duration: info.duration,
				width: info.width,
				height: info.height
			});
			toast.success('Poster generated');
			await fetchAssets(currentPage);
			// Re-read so the inspector's own copy carries metadata.poster.
			const refreshed = await assets.getById(asset.id);
			if (refreshed.success && refreshed.data) selectedAsset = refreshed.data;
		} catch (err) {
			cmsLogger.error('[Media]', 'Poster generation failed:', err);
			toast.error('Failed to save poster');
		} finally {
			generatingPoster = false;
		}
	}

	function getPosterUrl(asset: Asset): string | null {
		const hasPoster = (asset.metadata as { poster?: unknown } | null)?.poster === true;
		return hasPoster ? `/media/${asset.id}/poster.webp` : null;
	}

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

	/**
	 * Placeholder icon for an asset with no visual preview.
	 *
	 * Everything non-image used to fall through to one page icon, so an mp4, an
	 * mp3 and a PDF were indistinguishable in the grid — most obvious once the
	 * media-kind filter existed, where narrowing to "Video" produced a wall of
	 * identical document icons.
	 */
	/**
	 * Whether a tile should show the whole asset rather than fill its frame.
	 *
	 * `object-contain` everywhere honoured "don't crop the assets", but in a square
	 * tile it pillarboxes every portrait photo, so the grid became mostly empty
	 * background. The reason not to crop was logos and transparent artwork — a
	 * wordmark cropped to a square is unrecognisable — and that reason doesn't
	 * extend to photographs, where the tile is a recognition aid and the inspector
	 * still shows the full uncropped image.
	 *
	 * SVG is the case we can detect from the mime type. Transparency in a PNG
	 * isn't knowable without decoding the file, so PNGs are treated as artwork
	 * too: over-containing a photo costs some whitespace, while over-cropping a
	 * logo destroys it.
	 */
	/**
	 * Turn a stored field path into something an editor recognises:
	 * `coverImage` → "Cover image", `seo.ogImage` → "Seo › Og image",
	 * `content[13].images[0]` → "Content 14 › Images 1".
	 *
	 * Indices are shown 1-based because they are being read by a person counting
	 * items on a page, not by anything that will index back into the array.
	 */
	function humanizeFieldPath(path: string): string {
		return path
			.split('.')
			.map((segment) => {
				const match = /^(.*?)((\[\d+\])*)$/.exec(segment);
				const name = match?.[1] ?? segment;
				const indices = (match?.[2] ?? '')
					.match(/\d+/g)
					?.map((n) => ` ${Number(n) + 1}`)
					.join('');
				const label = name
					.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
					.replace(/^./, (c) => c.toUpperCase())
					.toLowerCase()
					.replace(/^./, (c) => c.toUpperCase());
				return `${label}${indices ?? ''}`;
			})
			.join(' › ');
	}

	function isVectorOrTransparent(asset: Asset): boolean {
		const mime = asset.mimeType ?? '';
		return mime === 'image/svg+xml' || mime === 'image/png';
	}

	function isVideo(asset: Asset): boolean {
		return (asset.mimeType ?? '').startsWith('video/');
	}

	function isAudio(asset: Asset): boolean {
		return (asset.mimeType ?? '').startsWith('audio/');
	}

	/**
	 * Playable length, when we know it. Read from `metadata.duration` (seconds) —
	 * the column set doesn't have a duration field, but `AssetMetadata` carries an
	 * open index signature, so this needs no migration. It is only populated for
	 * assets uploaded through the browser, which is where the duration can be read
	 * off a `<video>` element; anything uploaded via the API has none, hence the
	 * null return rather than a "0:00" that would look like an empty file.
	 */
	function formatDuration(asset: Asset): string | null {
		const seconds = Number((asset.metadata as { duration?: unknown } | null)?.duration);
		if (!Number.isFinite(seconds) || seconds <= 0) return null;
		const total = Math.round(seconds);
		const hours = Math.floor(total / 3600);
		const minutes = Math.floor((total % 3600) / 60);
		const secs = total % 60;
		return hours > 0
			? `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
			: `${minutes}:${String(secs).padStart(2, '0')}`;
	}

	function fileIconFor(mimeType: string | null | undefined) {
		const mime = mimeType ?? '';
		if (mime.startsWith('video/')) return Film;
		if (mime.startsWith('audio/')) return Music;
		if (mime.startsWith('image/')) return FileImage;
		if (/zip|tar|gzip|compressed|archive/.test(mime)) return FileArchive;
		return FileText;
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

	/**
	 * Cycle the sort and refetch.
	 *
	 * The refetch is the point: the order is the server's now, so changing it
	 * without asking for a new page would leave the previous ordering on screen
	 * under a label claiming otherwise. Back to page 1 too — "page 3 of newest"
	 * and "page 3 of A–Z" hold unrelated rows, so keeping the number would land
	 * the user somewhere arbitrary.
	 */
	function cycleSort() {
		const orders: (typeof sortOrder)[] = ['newest', 'oldest', 'name-asc', 'name-desc'];
		const idx = orders.indexOf(sortOrder);
		sortOrder = orders[(idx + 1) % orders.length]!;
		currentPage = 1;
		fetchAssets(1);
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

<!--
	The selection checkbox, shared by every tile and row.

	The capture-phase handler is what makes shift-click work on the checkbox
	itself and not just the tile around it: bits-ui's Checkbox fires
	`onCheckedChange` from its own click, so by the time the event bubbled out to
	us the single-item toggle had already happened and the range would have been
	computed against a selection that had moved underneath it. Intercepting in
	capture — only when Shift is held — stops the click before the checkbox ever
	sees it. Without Shift the event passes straight through, and the
	`stopPropagation` on the checkbox keeps it from also reaching the row.
-->
<!-- Stand-in for an asset with no visual preview. A snippet because `{@const}`
     has to be the immediate child of a block, and the icon component is chosen
     per mime type. -->
{#snippet fileIcon(mimeType: string | null | undefined, sizeClass: string)}
	{@const Icon = fileIconFor(mimeType)}
	<Icon class="text-muted-foreground {sizeClass}" />
{/snippet}

{#snippet selectCheckbox(asset: Asset)}
	<div
		onclickcapture={(e) => {
			if (!e.shiftKey) return;
			e.preventDefault();
			e.stopPropagation();
			selectRange(asset.id);
		}}
	>
		<Checkbox
			checked={selectedIds.has(asset.id)}
			onCheckedChange={() => handleSelectClick(asset.id, { shiftKey: false })}
			onclick={(e) => e.stopPropagation()}
		/>
	</div>
{/snippet}

<div
	class="flex h-full flex-col"
	role="region"
	ondragenter={handleDragEnter}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondragend={handleDragEnd}
	ondrop={handleDrop}
>
	<!-- Drag overlay -->
	{#if isDragging}
		<!--
			`pointer-events-none` is load-bearing, not cosmetic. The overlay appears
			directly under the cursor mid-drag, so without it the overlay becomes the
			drag target the moment it renders: that fires dragleave on the region,
			which hides the overlay, which puts the cursor back over the grid, which
			shows it again — a feedback loop running at pointer-move rate. The counter
			alone doesn't save you here, because these are real boundary crossings.
		-->
		<div
			class="bg-primary/5 border-primary pointer-events-none absolute inset-0 z-50 flex items-center justify-center border-2 border-dashed"
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
					// Deliberately does not clear the queue. Clicking outside the dialog
					// dismisses it, and wiping the list on reopen meant an accidental
					// click discarded a batch — including uploads still running, which
					// carry on regardless and were simply no longer visible. The queue is
					// cleared only on an explicit Clear list or Done.
					showUploadModal = true;
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

		<!-- Media kind. Filtering happens in SQL, so it narrows the whole library
		     rather than the loaded page. -->
		<select
			value={categoryFilter}
			onchange={(e) => {
				categoryFilter = (e.target as HTMLSelectElement).value as CategoryFilter;
				currentPage = 1;
				fetchAssets(1);
			}}
			aria-label="Filter by media type"
			class="border-input bg-background text-foreground hidden h-7 rounded-md border px-1.5 text-xs sm:block"
		>
			<option value="all">All types</option>
			<option value="image">Images</option>
			<option value="svg">SVG</option>
			<option value="video">Video</option>
			<option value="audio">Audio</option>
			<option value="document">Documents</option>
		</select>

		{#if usageIndexing}
			<span
				class="text-muted-foreground hidden items-center gap-1.5 text-xs sm:inline-flex"
				title="Building the reference index. Usage results are incomplete until it finishes."
			>
				<span
					class="border-muted-foreground/40 h-3 w-3 animate-spin rounded-full border-2 border-t-transparent"
				></span>
				Indexing usage…
			</span>
		{/if}

		<!-- Used / unused. The actionable half is "Unused": it is how a library gets
		     cleaned up, and it only became answerable once references were indexed. -->
		<select
			value={usageFilter}
			onchange={(e) => {
				usageFilter = (e.target as HTMLSelectElement).value as UsageFilter;
				currentPage = 1;
				fetchAssets(1);
			}}
			aria-label="Filter by usage"
			class="border-input bg-background text-foreground hidden h-7 rounded-md border px-1.5 text-xs sm:block"
		>
			<option value="all">All assets</option>
			<option value="in-use">In use</option>
			<option value="unused">Unused</option>
		</select>

		<!-- Grid density. Replaces the page-size select, which cost permanent
		     toolbar space to answer a question editors rarely have — how many
		     assets fit on a page matters far less than whether they can tell one
		     thumbnail from another. Grid only; the list view has a fixed row. -->
		{#if viewMode === 'grid'}
			<div class="bg-muted hidden items-center rounded-md p-0.5 sm:flex">
				{#each [{ id: 'compact' as const, label: 'Compact' }, { id: 'default' as const, label: 'Default' }, { id: 'large' as const, label: 'Large' }] as option (option.id)}
					<button
						onclick={() => (gridDensity = option.id)}
						title="{option.label} thumbnails"
						aria-pressed={gridDensity === option.id}
						class="rounded px-2 py-1 text-xs transition-colors {gridDensity === option.id
							? 'bg-background text-foreground shadow-sm'
							: 'text-muted-foreground hover:text-foreground'}"
					>
						{option.label}
					</button>
				{/each}
			</div>
		{/if}

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
					<!-- `orderedAssets`, not `sortedAssets`: on a page where every asset is
				     already selected, `sortedAssets` is empty and the pinned list holds
				     all of them — this branch would have replaced those tiles with
				     "No assets found". -->
				{:else if orderedAssets.length === 0}
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
					<!-- Bulk action bar (shared for grid and list).
					     Select-all lives here rather than only in the list header, which
					     is where it used to be — the grid is the view people actually
					     bulk-select in, and it had no way to do it at all.

					     `sticky top-0` against the scroll container: selecting is the one
					     task here that involves scrolling far from the controls, so a bar
					     that scrolls away strands the selection — you have to scroll back
					     to act on it, and the running count is invisible while you build
					     it. The opaque `bg-muted` is what keeps it legible over the tiles
					     passing underneath. -->
					{#if selectable && multiSelect}
						<div
							class="bg-muted border-border sticky top-0 z-20 flex items-center gap-3 border-b px-4 py-2"
						>
							<span class="text-sm font-medium">
								{selectedIds.size} selected
							</span>
							<button
								onclick={toggleSelectAll}
								class="text-muted-foreground hover:text-foreground text-sm transition-colors"
							>
								{allSelected ? 'Deselect page' : 'Select page'}
							</button>
							<span class="text-muted-foreground hidden text-xs lg:inline">
								Shift-click to extend a range
							</span>
							<div class="flex-1"></div>
							<Button variant="default" size="sm" onclick={confirmMultiSelect}>Done</Button>
						</div>
					{:else if isSelectMode}
						<div
							class="bg-muted border-border sticky top-0 z-20 flex items-center gap-3 border-b px-4 py-2"
						>
							<span class="text-sm font-medium">
								{selectedIds.size} selected
							</span>
							<button
								onclick={toggleSelectAll}
								class="text-muted-foreground hover:text-foreground text-sm transition-colors"
							>
								{allSelected ? 'Deselect page' : 'Select page'}
							</button>
							{#if selectedIds.size > 0}
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
									onclick={clearSelection}
									class="text-muted-foreground hover:text-foreground text-sm transition-colors"
								>
									Clear selection
								</button>
							{/if}
							<div class="flex-1"></div>
							<span class="text-muted-foreground hidden text-xs lg:inline">
								Shift-click to extend a range
							</span>
						</div>
					{/if}
					{#if viewMode === 'grid'}
						<!-- Grid View -->
						<!-- `select-none`: shift-click is a selection gesture here, and
						     without it the browser also drags a blue text highlight across
						     every filename in the range. -->
						<div
							class="grid gap-3 p-3 select-none"
							style="grid-template-columns: repeat(auto-fill, minmax({TILE_MIN_WIDTH[
								gridDensity
							]}px, 1fr));"
						>
							{#each pinnedAssets as asset (asset.id)}
								<button
									onclick={(e) => {
										if (selectable && multiSelect) {
											handleSelectClick(asset.id, e);
										} else {
											openAssetDetail(asset);
										}
									}}
									class="group border-border bg-card relative flex flex-col overflow-hidden rounded-md border text-left transition-all {selectedIds.has(
										asset.id
									)
										? 'border-primary ring-primary/40 ring-2'
										: selectedAsset?.id === asset.id
											? 'border-primary ring-primary/40 ring-2'
											: 'hover:border-muted-foreground/40 hover:shadow-sm'}"
								>
									<div class="bg-muted/30 relative aspect-square overflow-hidden">
										<!-- Private assets are marked, because nothing else on the tile
										     distinguishes one. Privacy is declared on a schema field rather
										     than chosen here, so without a badge an editor has no way to see
										     which assets a `private: true` actually covers — and the honest
										     answer (only those uploaded through that field) is surprising.
										     Read-only: it reports the schema's decision rather than offering
										     to change it. -->
										{#if asset.isPrivate}
											<span
												class="pointer-events-none absolute top-1.5 left-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/70"
												title="Private — needs a session or a signed URL"
											>
												<Lock class="h-3 w-3 text-white" />
											</span>
										{/if}
										<!-- Playable media reads as playable at a glance. Without this a
										     video and a PDF differ only by a small glyph, which the
										     media-kind filter made obvious: narrowing to Video produced a
										     grid of near-identical cards. -->
										{#if isVideo(asset) || isAudio(asset)}
											{@const duration = formatDuration(asset)}
											<!-- The play glyph belongs over a picture, where it says "this
											     still is a video". Over the placeholder icon used for audio, or
											     for a video with no poster yet, it stacks a second symbol on a
											     first — which is what made a WAV tile look cluttered. -->
											{#if getPosterUrl(asset)}
												<div
													class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
												>
													<span
														class="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 backdrop-blur-[1px]"
													>
														<Play class="h-4 w-4 translate-x-[1px] fill-white text-white" />
													</span>
												</div>
											{/if}
											{#if duration}
												<span
													class="pointer-events-none absolute right-1.5 bottom-1.5 z-10 rounded-sm bg-black/70 px-1 py-0.5 text-[10px] font-medium text-white tabular-nums"
												>
													{duration}
												</span>
											{/if}
										{/if}
										{#if isImage(asset)}
											<img
												src={getThumbnailUrl(asset)}
												alt={asset.alt || asset.originalFilename}
												class="h-full w-full {isVectorOrTransparent(asset)
													? 'object-contain p-3'
													: 'object-cover'}"
												loading="lazy"
											/>
										{:else if getPosterUrl(asset)}
											<!-- A frame extracted at upload. Cropped like a photo: it is a
											     still from a rectangular video, not artwork with edges to
											     preserve. -->
											<img
												src={getPosterUrl(asset)}
												alt={asset.alt || asset.originalFilename}
												class="h-full w-full object-cover"
												loading="lazy"
											/>
										{:else}
											<div class="flex h-full items-center justify-center">
												{@render fileIcon(
													asset.mimeType,
													'h-1/3 w-1/3 min-h-8 min-w-8 max-h-20 max-w-20'
												)}
											</div>
										{/if}
										{#if isSelectMode && !selectable}
											<div class="absolute top-1.5 left-1.5">
												{@render selectCheckbox(asset)}
											</div>
										{/if}
									</div>
									<div class="border-border min-w-0 border-t px-2 py-1.5">
										<p class="text-foreground truncate text-xs" title={asset.originalFilename}>
											{asset.originalFilename}
										</p>
										<p class="text-muted-foreground truncate text-[11px]">
											{assetMetaLine(asset)}
										</p>
									</div>
								</button>
							{/each}
							{#each sortedAssets as asset (asset.id)}
								<button
									onclick={(e) => {
										if (isSelectMode) {
											handleSelectClick(asset.id, e);
										} else {
											openAssetDetail(asset);
										}
									}}
									class="group border-border bg-card relative flex flex-col overflow-hidden rounded-md border text-left transition-all {selectedIds.has(
										asset.id
									)
										? 'border-primary ring-primary/40 ring-2'
										: selectedAsset?.id === asset.id
											? 'border-primary ring-primary/40 ring-2'
											: 'hover:border-muted-foreground/40 hover:shadow-sm'}"
								>
									<div class="bg-muted/30 relative aspect-square overflow-hidden">
										<!-- Private assets are marked, because nothing else on the tile
										     distinguishes one. Privacy is declared on a schema field rather
										     than chosen here, so without a badge an editor has no way to see
										     which assets a `private: true` actually covers — and the honest
										     answer (only those uploaded through that field) is surprising.
										     Read-only: it reports the schema's decision rather than offering
										     to change it. -->
										{#if asset.isPrivate}
											<span
												class="pointer-events-none absolute top-1.5 left-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/70"
												title="Private — needs a session or a signed URL"
											>
												<Lock class="h-3 w-3 text-white" />
											</span>
										{/if}
										<!-- Playable media reads as playable at a glance. Without this a
										     video and a PDF differ only by a small glyph, which the
										     media-kind filter made obvious: narrowing to Video produced a
										     grid of near-identical cards. -->
										{#if isVideo(asset) || isAudio(asset)}
											{@const duration = formatDuration(asset)}
											<!-- The play glyph belongs over a picture, where it says "this
											     still is a video". Over the placeholder icon used for audio, or
											     for a video with no poster yet, it stacks a second symbol on a
											     first — which is what made a WAV tile look cluttered. -->
											{#if getPosterUrl(asset)}
												<div
													class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
												>
													<span
														class="flex h-9 w-9 items-center justify-center rounded-full bg-black/45 backdrop-blur-[1px]"
													>
														<Play class="h-4 w-4 translate-x-[1px] fill-white text-white" />
													</span>
												</div>
											{/if}
											{#if duration}
												<span
													class="pointer-events-none absolute right-1.5 bottom-1.5 z-10 rounded-sm bg-black/70 px-1 py-0.5 text-[10px] font-medium text-white tabular-nums"
												>
													{duration}
												</span>
											{/if}
										{/if}
										{#if isImage(asset)}
											<img
												src={getThumbnailUrl(asset)}
												alt={asset.alt || asset.originalFilename}
												class="h-full w-full {isVectorOrTransparent(asset)
													? 'object-contain p-3'
													: 'object-cover'}"
												loading="lazy"
											/>
										{:else if getPosterUrl(asset)}
											<!-- A frame extracted at upload. Cropped like a photo: it is a
											     still from a rectangular video, not artwork with edges to
											     preserve. -->
											<img
												src={getPosterUrl(asset)}
												alt={asset.alt || asset.originalFilename}
												class="h-full w-full object-cover"
												loading="lazy"
											/>
										{:else}
											<div class="flex h-full items-center justify-center">
												{@render fileIcon(
													asset.mimeType,
													'h-1/3 w-1/3 min-h-8 min-w-8 max-h-20 max-w-20'
												)}
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
										{:else if isSelectMode || canDeleteAssets}
											<!--
												Checkbox overlay. Revealed on hover when not yet in select
												mode, which gives the grid the same way in as the list —
												whose checkboxes are always visible. Before this, starting a
												selection from the grid meant knowing that the toolbar's
												icon button existed, and the grid is where a page of
												thumbnails is actually triaged.

												Gated on `canDeleteAssets` for the same reason that button
												is: with no bulk action available, a selection has nowhere
												to go.
											-->
											<div
												class="absolute top-1.5 left-1.5 transition-opacity {isSelectMode ||
												selectedIds.has(asset.id)
													? 'opacity-100'
													: 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'}"
											>
												{@render selectCheckbox(asset)}
											</div>
										{/if}
									</div>
									<div class="border-border min-w-0 border-t px-2 py-1.5">
										<p class="text-foreground truncate text-xs" title={asset.originalFilename}>
											{asset.originalFilename}
										</p>
										<p class="text-muted-foreground truncate text-[11px]">
											{assetMetaLine(asset)}
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
						<div class="w-full select-none">
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
							<!-- `orderedAssets`, not `sortedAssets`: in multi-select picker mode
							     the already-selected assets are filtered out of `sortedAssets`
							     and rendered separately as pinned tiles — which the list view
							     never rendered. The images already in the field were therefore
							     invisible here, and so impossible to deselect without switching
							     to grid. -->
							{#each orderedAssets as asset (asset.id)}
								<!-- Desktop row -->
								<button
									onclick={(e) => {
										if (selectable && multiSelect) {
											openAssetDetail(asset);
										} else if (isSelectMode) {
											handleSelectClick(asset.id, e);
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
										{@render selectCheckbox(asset)}
									</div>
									<div class="bg-muted/30 h-10 w-10 overflow-hidden rounded">
										{#if isImage(asset)}
											<img
												src={getThumbnailUrl(asset)}
												alt={asset.alt || asset.originalFilename}
												class="h-full w-full object-cover"
												loading="lazy"
											/>
										{:else if getPosterUrl(asset)}
											<!-- Same poster the grid uses. The list had only the placeholder
											     icon branch, so a video with a perfectly good frame still
											     rendered as a generic film glyph here. -->
											<img
												src={getPosterUrl(asset)}
												alt={asset.alt || asset.originalFilename}
												class="h-full w-full object-cover"
												loading="lazy"
											/>
										{:else}
											<div class="flex h-full items-center justify-center">
												{@render fileIcon(asset.mimeType, 'h-4 w-4')}
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
									onclick={(e) => {
										if (selectable && multiSelect) {
											openAssetDetail(asset);
										} else if (isSelectMode) {
											handleSelectClick(asset.id, e);
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
										{@render selectCheckbox(asset)}
									</div>
									<div class="bg-muted/30 h-10 w-10 shrink-0 overflow-hidden rounded">
										{#if isImage(asset)}
											<img
												src={getThumbnailUrl(asset)}
												alt={asset.alt || asset.originalFilename}
												class="h-full w-full object-cover"
												loading="lazy"
											/>
										{:else if getPosterUrl(asset)}
											<!-- Same poster the grid uses. The list had only the placeholder
											     icon branch, so a video with a perfectly good frame still
											     rendered as a generic film glyph here. -->
											<img
												src={getPosterUrl(asset)}
												alt={asset.alt || asset.originalFilename}
												class="h-full w-full object-cover"
												loading="lazy"
											/>
										{:else}
											<div class="flex h-full items-center justify-center">
												{@render fileIcon(asset.mimeType, 'h-4 w-4')}
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
			<!--
				The panel is a fixed-height flex column with exactly one scrolling
				child (the tab content), rather than one big scroll container.

				It used to be the latter: `md:overflow-y-auto` on the panel meant the
				preview, the tabs and the Save button all scrolled together, so saving
				alt text on any asset required scrolling past a 200px preview and five
				fields to reach the button — every time, for every asset. Constraining
				the scroll to the fields keeps the header, the preview, the tabs and
				the action footer on screen permanently.
			-->
			<div
				class="bg-background border-border flex min-h-0 flex-col border-t md:w-[350px] md:shrink-0 md:border-t-0 md:border-l"
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
					{:else if isVideo(selectedAsset)}
						<!-- A real <video>, not an iframe: an iframe hands off to the browser's
						     standalone media viewer, which can't be styled or controlled.

						     `preload="metadata"` is affordable because /media/:id/:filename now
						     answers Range with 206, so the browser fetches the moov atom rather
						     than the file — which is also where the duration in the controls
						     comes from. Without ranges this had to be "none", since a partial
						     fetch was impossible and metadata preload degraded into downloading
						     the whole video just to draw the player. -->
						<video
							src={getOriginalUrl(selectedAsset)}
							controls
							preload="metadata"
							class="bg-muted/30 mb-3 max-h-52 w-full rounded-lg object-contain"
						>
							<track kind="captions" />
						</video>
						<!-- Only reachable when the automatic pass on load already failed —
						     usually a codec this browser can't decode. Kept as an explicit
						     retry rather than leaving the asset with no way forward. -->
						{#if !getPosterUrl(selectedAsset) && canUpload && posterAttempts.has(selectedAsset.id)}
							<Button
								variant="outline"
								size="sm"
								class="mb-3 w-full"
								disabled={generatingPoster}
								onclick={() => generatePoster(selectedAsset!)}
							>
								{generatingPoster ? 'Reading a frame…' : 'Generate poster'}
							</Button>
						{/if}
					{:else if isAudio(selectedAsset)}
						<audio
							src={getOriginalUrl(selectedAsset)}
							controls
							preload="metadata"
							class="mb-3 w-full"
						></audio>
					{:else}
						<div
							class="bg-muted/30 mb-3 flex h-28 items-center justify-center overflow-hidden rounded-lg"
						>
							{@render fileIcon(selectedAsset.mimeType, 'h-12 w-12')}
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
				<div class="min-h-0 flex-1 overflow-y-auto p-4">
					{#if detailTab === 'details'}
						<!-- Summary, then the technical detail folded away.
						     Filename, MIME type, size, dimensions, upload date and asset id
						     all had equal billing above the fields an editor actually edits,
						     so the panel led with facts nobody came for and pushed alt text
						     below the fold. The one-line summary carries what identifies an
						     asset at a glance; everything addressed to a developer moves into
						     a disclosure that stays shut. -->
						<div class="mb-3">
							<p class="truncate text-sm font-medium" title={selectedAsset.originalFilename}>
								{selectedAsset.originalFilename}
							</p>
							<p class="text-muted-foreground mt-0.5 text-xs">
								{assetMetaLine(selectedAsset)}{formatDuration(selectedAsset)
									? ` · ${formatDuration(selectedAsset)}`
									: ''}
							</p>
							<!-- Spelled out here rather than left to the tile's lock icon: this
							     is where someone comes to ask "why can't the site show this?",
							     and a badge alone doesn't say what private *means* or how the
							     asset became private. -->
							{#if selectedAsset.isPrivate}
								<p class="text-muted-foreground mt-1.5 flex items-start gap-1.5 text-xs">
									<Lock class="mt-[1px] h-3 w-3 shrink-0" />
									<span>
										Private — needs a signed URL or a session in this organization. Set by the
										schema field this asset was uploaded into.
									</span>
								</p>
							{/if}
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

							{#if !canUpload}
								<p class="text-muted-foreground text-xs">
									You don't have permission to edit asset metadata.
								</p>
							{/if}

							<!-- Everything addressed to a developer rather than an editor.
							     A native <details> rather than a toggle in component state:
							     it needs no state to get wrong, it is keyboard accessible and
							     findable by in-page search for free, and it reopens closed on
							     the next asset, which is the right default for a panel whose
							     job is the fields above. -->
							<details class="group border-border mt-2 border-t pt-3">
								<summary
									class="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1 text-xs select-none [&::-webkit-details-marker]:hidden"
								>
									<!-- `list-none` alone leaves Safari's marker in place, and the
									     webkit rule alone leaves nothing to indicate the row opens.
									     Both, plus a chevron that turns with the group's open state. -->
									<ChevronRight size={12} class="transition-transform group-open:rotate-90" />
									File information
								</summary>
								<div class="mt-2 space-y-2 text-xs">
									<div class="flex justify-between gap-2">
										<span class="text-muted-foreground">Type</span>
										<span class="font-mono">{selectedAsset.mimeType}</span>
									</div>
									<div class="flex justify-between gap-2">
										<span class="text-muted-foreground">Size</span>
										<span>{formatSize(selectedAsset.size)}</span>
									</div>
									{#if selectedAsset.width && selectedAsset.height}
										<div class="flex justify-between gap-2">
											<span class="text-muted-foreground">Dimensions</span>
											<span>{selectedAsset.width} × {selectedAsset.height}</span>
										</div>
									{/if}
									{#if formatDuration(selectedAsset)}
										<div class="flex justify-between gap-2">
											<span class="text-muted-foreground">Duration</span>
											<span class="tabular-nums">{formatDuration(selectedAsset)}</span>
										</div>
									{/if}
									<div class="flex justify-between gap-2">
										<span class="text-muted-foreground">Uploaded</span>
										<span>{formatDate(selectedAsset.createdAt)}</span>
									</div>
									<!-- The id is the asset's real identity: what a document stores
									     in `{ asset: { _ref } }`, what every storage key derives
									     from, and the only stable handle once the filename is
									     editable. Demoted, not dropped. -->
									<div class="flex items-center justify-between gap-2">
										<span class="text-muted-foreground">Asset ID</span>
										<button
											onclick={() => copyAssetId(selectedAsset!)}
											title="{selectedAsset.id} — click to copy"
											class="hover:text-foreground max-w-[180px] cursor-pointer truncate font-mono"
										>
											{copiedId ? 'Copied!' : selectedAsset.id}
										</button>
									</div>
								</div>
							</details>
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
												{ref.type}{ref.status ? ` · ${ref.status}` : ''}{ref.fieldPaths?.length
													? ` · ${ref.fieldPaths.map(humanizeFieldPath).join(', ')}`
													: ''}
											</p>
										</div>
									</button>
								{/each}
							</div>
						{/if}
					{/if}
				</div>

				<!--
					Action footer — outside the scroll container, so Save is on screen
					whichever field is being edited.

					`sticky bottom-0` is for the mobile layout, where the panel is
					stacked below the grid and the *page* is what scrolls; on desktop
					the flex column already puts it at the bottom and sticky is inert.

					Disabled until something actually changed: the button used to be
					live at all times, so the only way to know whether an edit had been
					saved was to press it again.
				-->
				{#if detailTab === 'details' && canUpload}
					<div class="border-border bg-background sticky bottom-0 border-t p-3">
						<Button
							onclick={saveMetadata}
							disabled={isSaving || !metadataDirty}
							size="sm"
							class="w-full"
						>
							{isSaving ? 'Saving...' : metadataDirty ? 'Save changes' : 'Saved'}
						</Button>
					</div>
				{/if}
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
			ondragenter={(e) => {
				if (!isFileDrag(e)) return;
				e.preventDefault();
				modalDragDepth++;
			}}
			ondragover={(e) => {
				if (!isFileDrag(e)) return;
				e.preventDefault();
			}}
			ondragleave={(e) => {
				if (modalDragDepth === 0) return;
				e.preventDefault();
				modalDragDepth--;
			}}
			ondragend={() => {
				modalDragDepth = 0;
			}}
			ondrop={(e) => {
				e.preventDefault();
				modalDragDepth = 0;
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
			<div class="text-muted-foreground mt-4 flex items-baseline justify-between text-xs">
				<span>
					{uploadQueue.length}
					{uploadQueue.length === 1 ? 'file' : 'files'} selected
				</span>
				<span class="tabular-nums">{formatSize(queuedBytes)}</span>
			</div>
			<div class="mt-2 max-h-64 space-y-2 overflow-y-auto">
				{#each uploadQueue as item, index}
					<div
						class="border-border flex items-center gap-3 rounded-md border px-3 py-2 {item.status ===
						'failed'
							? 'border-destructive/50'
							: ''}"
					>
						<div class="bg-muted/40 border-border h-9 w-9 shrink-0 overflow-hidden rounded border">
							{#if item.previewUrl}
								<img src={item.previewUrl} alt="" class="h-full w-full object-cover" />
							{:else}
								<div class="flex h-full items-center justify-center">
									{@render fileIcon(item.file.type, 'h-4 w-4')}
								</div>
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm">{item.file.name}</p>
							{#if item.status === 'failed' && item.error}
								<p class="text-destructive text-xs">{item.error}</p>
							{:else if item.status === 'pending' && isUploading}
								<p class="text-muted-foreground text-xs">Waiting…</p>
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

			<!-- The dialog no longer closes itself, so it needs an explicit way out.
			     Disabled mid-flight: dismissing it would hide in-progress uploads
			     that are still running. -->
			<div class="mt-4 flex items-center justify-between gap-3">
				<Button variant="ghost" size="sm" disabled={isUploading} onclick={clearUploadQueue}>
					Clear list
				</Button>
				<Button
					size="sm"
					disabled={isUploading}
					onclick={() => {
						showUploadModal = false;
						clearUploadQueue();
					}}
				>
					Done
				</Button>
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
