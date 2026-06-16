<script lang="ts">
	import { tick } from 'svelte';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { documents } from '../../api/documents';
	import { assets } from '../../api/assets';
	import { ApiError } from '../../api/client';
	import SchemaField from './SchemaField.svelte';
	import { findOrphanedFields, type OrphanedField } from '../../schema-utils/cleanup';
	import type { SchemaType } from '../../types/schemas.js';
	import { Rule } from '../../field-validation/rule';
	import { hasUnpublishedChanges } from '../../utils/content-hash';
	import { setSchemaContext } from '../../schema-context.svelte';
	import { setSaveStateContext } from '../../save-state-context.svelte';
	import { usePermissions } from '../../permissions-context.svelte';
	import { getDefaultValueForFieldType } from '../../utils/field-defaults';
	import { notifyDocumentChanged } from '../../document-refresh.svelte';
	import { collectReferenceIds } from '../../utils/reference-walk';
	import { cmsLogger } from '../../utils/logger';
	import { toast } from 'svelte-sonner';
	import { confirmDialog } from './confirm-dialog/confirm-dialog.svelte';
	import {
		History,
		Trash2,
		Ellipsis,
		Code,
		Maximize2,
		Minimize2,
		Monitor,
		RefreshCw,
		ExternalLink
	} from '@lucide/svelte';
	import { stegaEncodeDocument } from '../../preview/stega.js';
	import { collectAssetRefs, injectAssetData, type ResolvedAsset } from '../../preview/assets.js';
	import { setRichtextEditorRegistry } from '../../richtext-context.svelte.js';

	interface Props {
		schemas: SchemaType[];
		documentType: string;
		documentId?: string | null;
		isCreating: boolean;
		onBack: () => void;
		onSaved?: (documentId: string) => void;
		onAutoSaved?: (documentId: string, title: string) => void;
		onDeleted?: () => void;
		onPublished?: (documentId: string) => void;
		onUnpublished?: (documentId: string) => void;
		onRestored?: (documentId: string) => void;
		onOpenReference?: (documentId: string, documentType: string) => void;
		onOpenVersionHistory?: (documentId: string) => void;
		externalVersionPreview?: {
			versionNumber: number;
			data: Record<string, any>;
			eventType: string;
			createdAt?: string;
		} | null;
		isReadOnly?: boolean;
		/** When true, the host has hidden side panels — show a Minimize toggle. */
		focusMode?: boolean;
		/** Toggle host-driven focus mode. Omit to hide the focus button entirely. */
		onToggleFocus?: () => void;
		/** When true, split the editor with a live preview iframe on the right. */
		presentationMode?: boolean;
		/** Toggle host-driven presentation mode. Omit to hide the button entirely. */
		onTogglePresentation?: () => void;
		/** Organization ID from the host context — used as fallback for new docs that haven't been saved yet. */
		organizationId?: string | null;
	}

	let {
		schemas,
		documentType,
		documentId,
		isCreating,
		onBack,
		onSaved,
		onAutoSaved,
		onDeleted,
		onPublished,
		onUnpublished,
		onRestored,
		onOpenReference,
		onOpenVersionHistory,
		externalVersionPreview = null,
		isReadOnly = false,
		focusMode = false,
		onToggleFocus,
		presentationMode = false,
		onTogglePresentation,
		organizationId = null
	}: Props = $props();

	// Set schema context for child components (ArrayField, etc.)
	// svelte-ignore state_referenced_locally
	setSchemaContext(schemas);

	// Registry for RichtextField editors — allows focusFieldByName to position the cursor
	const richtextEditors = setRichtextEditorRegistry();

	// Read permissions from the AdminApp context for per-action gating.
	// `isReadOnly` prop, when explicitly true, forces everything off — this is
	// the escape hatch for hosts that embed the editor outside the RBAC shell
	// (version preview, public previews, etc).
	const perms = usePermissions();
	const canCreate = $derived(!isReadOnly && perms.can('document.create'));
	const canUpdate = $derived(!isReadOnly && perms.can('document.update'));
	const canDelete = $derived(!isReadOnly && perms.can('document.delete'));
	const canPublishDoc = $derived(!isReadOnly && perms.can('document.publish'));
	const canUnpublishDoc = $derived(!isReadOnly && perms.can('document.unpublish'));
	// Whichever capability matters for the *current* document state:
	// - create mode (no id yet) → document.create
	// - edit mode → document.update
	// Used for field editability + auto-save gating.
	const canWriteCurrentDoc = $derived(isCreating ? canCreate : canUpdate);
	// "Show no mutation UI at all" — when true, render the read-only badge in
	// place of the publish button cluster.
	const isViewingReadOnly = $derived(
		isReadOnly || (!canCreate && !canUpdate && !canDelete && !canPublishDoc && !canUnpublishDoc)
	);

	// Schema and document state
	let schema = $state<SchemaType | null>(null);
	let schemaLoading = $state(false);
	let schemaError = $state<string | null>(null);

	// Document data state
	let documentData = $state<Record<string, any>>({});
	let fullDocument = $state<any>(null); // Store full document with publishedHash
	let saving = $state(false);
	let saveError = $state<string | null>(null);
	let lastSaved = $state<Date | null>(null);
	let publishSuccess = $state<Date | null>(null);

	// Perspective toggle
	let perspective = $state<'draft' | 'published'>('draft');
	let publishedData = $state<Record<string, any> | null>(null);
	const isViewingPublished = $derived(perspective === 'published');

	// Field-level access: mirrors the server's strip/drop logic so the form
	// only shows fields the user can see and disables fields they can't write.
	function fieldRoleAllowed(list: string[] | undefined): boolean {
		if (!list) return true;
		const role = perms.role;
		return role !== null && list.includes(role);
	}
	const hiddenFieldNames = $derived(
		new Set(
			(schema?.fields ?? []).filter((f) => !fieldRoleAllowed(f.access?.read)).map((f) => f.name)
		)
	);
	function isFieldReadonly(fieldName: string): boolean {
		const field = schema?.fields.find((f) => f.name === fieldName);
		// In create mode, collection-level write ability is document.create;
		// in edit mode it's document.update. Per-field `access.update` still
		// wins as an additional restriction when the user IS able to write.
		if (!field) return !canWriteCurrentDoc;
		if (!fieldRoleAllowed(field.access?.update)) return true;
		return !canWriteCurrentDoc;
	}

	// Inspect modal
	let showInspect = $state(false);

	// Presentation mode — live preview iframe alongside the editor fields
	let iframeRef = $state<HTMLIFrameElement | null>(null);
	let iframeStega = $state(true);
	let previewEditMode = $state(true);
	let focusedFieldName = $state<string | null>(null);
	let fieldsWidth = $state(500);
	let isResizing = $state(false);

	function refreshPreview() {
		if (!iframeRef || !iframeUrl) return;
		iframeRef.src = iframeUrl;
	}

	// --- Live-preview asset resolution -------------------------------------------------
	// Asset URLs are normally resolved server-side at page load, so a newly-added/changed
	// image ref has no URL on the frontend until the change is saved + the page reloads
	// (auto-save is debounced, so a reload would race the save and lose). Instead we resolve
	// refs → { url, alt } here and inject them into the pushed document, so the URL travels
	// with the live snapshot — saved or not. (This mirrors how Payload carries upload URLs in
	// its live-preview form state.) The collect/inject walk is shared with the server's
	// `assetService.injectAssetUrls`, so preview and SSR documents come out the same shape.
	// Cached so typing (no new refs) never refetches.
	const previewAssetCache = new Map<string, ResolvedAsset>();

	async function resolvePreviewAssets(refs: Set<string>): Promise<void> {
		const missing = [...refs].filter((ref) => !previewAssetCache.has(ref));
		await Promise.all(
			missing.map(async (ref) => {
				try {
					const res = await assets.getById(ref);
					if (res.success && res.data) {
						previewAssetCache.set(ref, { url: res.data.url, alt: res.data.alt ?? undefined });
					}
				} catch {
					// Leave unresolved — the frontend falls back to its server-loaded map.
				}
			})
		);
	}

	// Snapshot the document, inject resolved asset URLs, and push it to the preview iframe.
	async function postPreviewData(win: Window): Promise<void> {
		const snapshot = $state.snapshot(documentData);
		const refs = collectAssetRefs(snapshot);
		await resolvePreviewAssets(refs);
		injectAssetData(snapshot, previewAssetCache);
		win.postMessage(
			{
				type: 'aphex:data',
				document: iframeStega ? stegaEncodeDocument(snapshot, schema?.fields ?? []) : snapshot
			},
			'*'
		);
	}

	function openPreviewInNewTab() {
		if (iframeUrl) window.open(iframeUrl, '_blank');
	}

	function startResize(e: MouseEvent) {
		e.preventDefault();
		isResizing = true;
		const startX = e.clientX;
		const startWidth = fieldsWidth;
		function onMove(ev: MouseEvent) {
			fieldsWidth = Math.max(500, Math.min(700, startWidth + (ev.clientX - startX)));
		}
		function onUp() {
			isResizing = false;
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
		}
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}

	// Derived from the already-loaded schema + live documentData — no extra prop needed.
	// orgId comes from _meta so multi-tenant schemas can build org-specific URLs.
	const resolvedPreviewUrl = $derived.by(() => {
		if (!schema?.previewUrl) return null;
		if (typeof schema.previewUrl === 'string') return schema.previewUrl;
		const orgId =
			(fullDocument?._meta?.organizationId as string | null | undefined) ?? organizationId ?? null;
		return schema.previewUrl(documentData as Record<string, unknown>, orgId) ?? null;
	});

	// Draft = preview URL as-is (with ?aphex-preview=1 + live data push).
	// Published = strip aphex-preview param so the iframe shows the real published page.
	// Relative paths (e.g. '/blog/x') resolve against the studio's own origin;
	// absolute URLs target a separate public site unchanged.
	const iframeUrl = $derived.by(() => {
		if (!resolvedPreviewUrl) return null;
		const base = typeof window !== 'undefined' ? window.location.origin : undefined;
		let u: URL;
		try {
			u = new URL(resolvedPreviewUrl, base);
		} catch {
			return resolvedPreviewUrl;
		}
		if (perspective === 'published') {
			u.searchParams.delete('aphex-preview');
		}
		return u.toString();
	});

	$effect(() => {
		if (!presentationMode) return;
		const handler = (e: MessageEvent) => {
			if (!e.data || typeof e.data !== 'object') return;
			const msg = e.data as {
				type: string;
				fieldPath?: string;
				blockIndex?: number;
				blockKey?: string;
				arrayIndex?: number;
				objectPath?: string;
				linkHref?: string;
			};
			if (msg.type === 'aphex:ready') {
				iframeStega = (msg as any).stega !== false;
				if (iframeRef?.contentWindow) postPreviewData(iframeRef.contentWindow);
				if (!previewEditMode) {
					iframeRef?.contentWindow?.postMessage({ type: 'aphex:edit-mode', enabled: false }, '*');
				}
			} else if (msg.type === 'aphex:field-click' && msg.fieldPath) {
				focusFieldByName(msg.fieldPath, {
					blockIndex: msg.blockIndex,
					blockKey: msg.blockKey,
					arrayIndex: msg.arrayIndex,
					objectPath: msg.objectPath,
					linkHref: msg.linkHref
				});
			}
		};
		window.addEventListener('message', handler);
		return () => window.removeEventListener('message', handler);
	});

	$effect(() => {
		if (!presentationMode || perspective === 'published' || !iframeRef?.contentWindow) return;
		// Track documentData so this effect re-runs on every edit; the debounce coalesces.
		void documentData;
		const timer = setTimeout(() => {
			if (iframeRef?.contentWindow) postPreviewData(iframeRef.contentWindow);
		}, 100);
		return () => clearTimeout(timer);
	});

	/**
	 * Map a portable text array index to the absolute ProseMirror cursor position (end of content)
	 * for that block in the TipTap editor. Accounts for list grouping (multiple PT list-item blocks
	 * collapse into one bulletList/orderedList TipTap node) and blockquote nesting.
	 * Returns null when the block can't be navigated to (nested lists, unknown structure).
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function findTiptapCursorForPTBlock(
		ptBlocks: unknown[],
		targetIdx: number,
		doc: any
	): number | null {
		// Absolute start positions of each TipTap top-level child
		const nodePositions: number[] = [];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		doc.forEach((_: any, offset: number) => nodePositions.push(offset));

		let tiptapIdx = 0;
		let ptIdx = 0;

		while (ptIdx < ptBlocks.length && tiptapIdx < doc.childCount) {
			const block = ptBlocks[ptIdx] as Record<string, unknown>;
			const isListItem = block._type === 'block' && block.listItem != null;

			if (isListItem) {
				// Count ALL consecutive list items — buildListNode consumes them into one TipTap node
				let groupCount = 0;
				let targetOffsetInGroup = -1; // which level-1 listItem the target is
				let level1Count = 0;
				let targetIsNested = false;

				while (ptIdx + groupCount < ptBlocks.length) {
					const b = ptBlocks[ptIdx + groupCount] as Record<string, unknown>;
					if (b._type !== 'block' || b.listItem == null) break;
					const bLevel = (b.level as number | undefined) ?? 1;
					if (ptIdx + groupCount === targetIdx) {
						if (bLevel === 1) targetOffsetInGroup = level1Count;
						else targetIsNested = true;
					}
					if (bLevel === 1) level1Count++;
					groupCount++;
				}

				if (targetIsNested) return null; // nested list items are too complex to navigate

				if (targetOffsetInGroup !== -1) {
					const listNode = doc.child(tiptapIdx);
					const listAbsPos = nodePositions[tiptapIdx] as number;
					let result: number | null = null;
					let itemIdx = 0;
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					listNode.forEach((listItem: any, liOffset: number) => {
						if (itemIdx++ !== targetOffsetInGroup) return;
						const para = listItem.firstChild;
						if (para?.isTextblock) {
							// listAbsPos + 1 (list open) + liOffset + 1 (listItem open) + 1 (para open) + content
							result = listAbsPos + 1 + liOffset + 2 + para.content.size;
						}
					});
					return result;
				}

				ptIdx += groupCount;
				tiptapIdx++;
			} else {
				if (ptIdx === targetIdx) {
					const node = doc.child(tiptapIdx);
					const nodeAbsPos = nodePositions[tiptapIdx] as number;

					if (node.type.name === 'blockquote') {
						// blockquote > paragraph
						const para = node.firstChild;
						if (para?.isTextblock) {
							return nodeAbsPos + 2 + para.content.size;
						}
					}

					if (node.isTextblock) {
						return nodeAbsPos + 1 + node.content.size;
					}

					return null;
				}
				ptIdx++;
				tiptapIdx++;
			}
		}

		return null;
	}

	async function focusFieldByName(
		fieldName: string,
		opts: {
			blockIndex?: number;
			blockKey?: string;
			arrayIndex?: number;
			objectPath?: string;
			linkHref?: string;
		} = {}
	) {
		focusedFieldName = fieldName;
		// Switch to the field's group so it's visible before scrolling
		const field = schema?.fields.find((f) => f.name === fieldName);
		if (field?.group) {
			const group = Array.isArray(field.group) ? field.group[0] : field.group;
			if (group) activeGroup = group;
		}
		await tick();
		const container = document.querySelector<HTMLElement>(`[data-field-name="${fieldName}"]`);
		if (!container) return;
		container.scrollIntoView({ behavior: 'smooth', block: 'center' });
		setTimeout(() => {
			if (focusedFieldName === fieldName) focusedFieldName = null;
		}, 2000);

		const { blockIndex, blockKey, arrayIndex, objectPath, linkHref } = opts;

		// 1. Richtext field — position cursor (text blocks) or open modal (custom blocks)
		const richtextHandle = richtextEditors.get(fieldName);
		const richtextEditor = richtextHandle?.editor;

		// Link click — drop the cursor *inside* the matching link mark and open the link
		// popover explicitly (the editor's transaction heuristic can miss a programmatic
		// selection move, so we don't rely on it here).
		if (richtextEditor && linkHref) {
			const doc = richtextEditor.state.doc;
			let linkPos: number | null = null;
			doc.descendants((node, pos) => {
				if (linkPos !== null) return false;
				if (
					node.isText &&
					node.marks.some((m) => m.type.name === 'link' && m.attrs.href === linkHref)
				) {
					linkPos = pos + 1; // a position inside the link's text
					return false;
				}
				return true;
			});
			if (linkPos !== null) {
				richtextEditor.commands.focus();
				richtextEditor.commands.setTextSelection(linkPos);
				richtextHandle?.openLinkPopover();
				return;
			}
		}

		if (richtextEditor && (blockIndex != null || blockKey)) {
			const doc = richtextEditor.state.doc;

			// Custom blocks carry a _key — find by key so index drift doesn't matter
			if (blockKey) {
				let nodePos: number | null = null;
				let nodeType: string | null = null;
				doc.forEach((node, offset) => {
					if (node.attrs._key === blockKey) {
						nodePos = offset;
						nodeType = node.attrs._type;
					}
				});
				if (nodePos !== null) {
					const domNode = richtextEditor.view.nodeDOM(nodePos) as HTMLElement | null;
					// Image blocks open their editor by clicking the block body — their only
					// <button> is Remove, so clicking the first button would DELETE the image.
					// Custom blocks (callout/code) open via their first button.
					if (nodeType === 'image') {
						domNode?.querySelector<HTMLElement>('[data-pt-image-edit]')?.click();
					} else {
						domNode?.querySelector<HTMLButtonElement>('button')?.click();
					}
				}
				return;
			}

			// Standard text blocks — use PT array to correctly map blockIndex → TipTap position,
			// accounting for list grouping and blockquote nesting.
			const ptBlocks = documentData[fieldName];
			if (Array.isArray(ptBlocks)) {
				const cursorPos = findTiptapCursorForPTBlock(ptBlocks, blockIndex!, doc);
				if (cursorPos !== null) {
					richtextEditor.commands.focus();
					richtextEditor.commands.setTextSelection(cursorPos);
					return;
				}
			}
			// Fallback: just focus the editor
			richtextEditor.commands.focus();
			return;
		}

		// 2. Nested object subfield — find the subfield container by its dotted path
		if (objectPath) {
			const subContainer = container.querySelector<HTMLElement>(
				`[data-field-path="${objectPath}"]`
			);
			if (subContainer) {
				subContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
				const focusable = subContainer.querySelector<HTMLElement>(
					'input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])'
				);
				focusable?.focus();
				return;
			}
		}

		// 3. Primitive array — focus the Nth input inside the array field
		if (arrayIndex != null) {
			const inputs = container.querySelectorAll<HTMLElement>(
				'input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])'
			);
			const target = inputs[arrayIndex];
			if (target) {
				target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
				target.focus();
				return;
			}
		}

		// 4. Fallback — focus the first interactive element in the field
		const focusable = container.querySelector<HTMLElement>(
			'input:not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly]), [contenteditable="true"]'
		);
		focusable?.focus();
	}

	// Field group tabs — only render when schema declares `groups`.
	// 'all' = show every field; otherwise filter to fields whose `group`
	// matches (supports string or string[]).
	let activeGroup = $state<string>('all');

	$effect(() => {
		if (!schema?.groups?.length) {
			activeGroup = 'all';
			return;
		}
		const defaultGroup = schema.groups.find((g) => g.default && !g.hidden);
		activeGroup = defaultGroup?.name ?? 'all';
	});

	function fieldInGroup(field: { group?: string | string[] }, groupName: string): boolean {
		if (groupName === 'all') return true;
		if (!field.group) return false;
		return Array.isArray(field.group) ? field.group.includes(groupName) : field.group === groupName;
	}

	function syntaxHighlightJson(json: string): string {
		return json.replace(
			/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
			(match) => {
				let cls = 'text-green-400'; // number
				if (/^"/.test(match)) {
					if (/:$/.test(match)) {
						// key
						const key = match.slice(0, -1); // remove trailing colon
						return `<span class="text-blue-400">${escapeHtml(key)}</span>:`;
					} else {
						cls = 'text-yellow-500'; // string
					}
				} else if (/true|false/.test(match)) {
					cls = 'text-orange-400'; // boolean
				} else if (/null/.test(match)) {
					cls = 'text-red-400'; // null
				}
				return `<span class="${cls}">${escapeHtml(match)}</span>`;
			}
		);
	}

	function escapeHtml(str: string): string {
		return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}
	let inspectTab = $state<'parsed' | 'raw'>('parsed');
	let inspectPerspective = $state<'draft' | 'published'>('draft');

	// Header options dropdown
	let showHeaderMenu = $state(false);

	// Version history
	let showVersionHistory = $state(false);
	let previewingVersion = $state<{
		versionNumber: number;
		data: Record<string, any>;
		eventType: string;
		createdAt?: string;
	} | null>(null);
	const activePreview = $derived(externalVersionPreview || previewingVersion);
	const isPreviewingVersion = $derived(!!activePreview);

	// Version list state — kept in component state so we can refresh it after
	// autosaves while the panel is open (otherwise new history events are
	// invisible until the panel is closed and reopened).
	let versionsList = $state<any[]>([]);
	let versionsLoading = $state(false);
	let versionsError = $state(false);

	async function loadVersions() {
		if (!documentId) return;
		versionsLoading = true;
		versionsError = false;
		try {
			const response = await documents.listVersions(documentId);
			if (response.success && response.data) {
				versionsList = response.data;
			} else {
				versionsError = true;
			}
		} catch {
			versionsError = true;
		} finally {
			versionsLoading = false;
		}
	}

	$effect(() => {
		if (showVersionHistory && documentId) {
			loadVersions();
		}
	});

	// Ticker to keep relative time updating
	let now = $state(Date.now());
	let tickerInterval: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		tickerInterval = setInterval(() => {
			now = Date.now();
		}, 10_000); // update every 10s
		return () => {
			if (tickerInterval) clearInterval(tickerInterval);
		};
	});

	function timeAgo(date: Date): string {
		const seconds = Math.floor((now - date.getTime()) / 1000);
		if (seconds < 5) return 'just now';
		if (seconds < 60) return `${seconds}s ago`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		return date.toLocaleDateString();
	}

	const savedAgoText = $derived(lastSaved ? `Saved ${timeAgo(lastSaved)}` : null);

	// Auto-save functionality (every 2 seconds when there are changes)
	let hasUnsavedChanges = $state(false);
	let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
	let hasValidationErrors = $state(false);
	// Snapshot of the default-initialized data for a brand-new (unsaved) document.
	// Used to detect real user edits without relying on "is the value truthy" heuristics,
	// so unchecking a boolean counts as a change and booleans with initialValue: true
	// don't auto-create the doc on mount.
	let initialDocumentData: Record<string, any> | null = null;

	// Share save state with nested components (e.g. ObjectModal) via context
	setSaveStateContext({
		get saving() {
			return saving;
		},
		get hasUnsavedChanges() {
			return hasUnsavedChanges;
		},
		get savedAgoText() {
			return savedAgoText;
		}
	});

	let orphanedFields = $state<OrphanedField[]>([]);
	let showOrphanedFields = $state(false);
	let schemaFields: SchemaField[] = [];

	// Track previous document to detect actual switches (not create→edit transitions)
	// Plain lets (not $state) — only read/written inside the clearing effect; no need for reactivity
	let previousDocumentId: string | null | undefined = undefined;
	let previousDocumentType: string | undefined = undefined;
	let justCreatedDocument = $state(false); // Flag to skip loadDocumentData after creation

	// Hash-based state tracking
	const hasUnpublishedContent = $derived(
		hasUnpublishedChanges(documentData, fullDocument?._meta?.publishedHash || null)
	);
	const isUnpublished = $derived(fullDocument?._meta?.status === 'unpublished');
	const canPublish = $derived(
		(hasUnpublishedContent || isUnpublished) && !saving && documentId && !hasValidationErrors
	);

	// Get preview title based on schema config. When viewing in published
	// perspective, read from the loaded published snapshot — otherwise the
	// header shows the draft's title even though the body shows published
	// fields, which is confusing.
	function getPreviewTitle(): string {
		const source = perspective === 'published' && publishedData ? publishedData : documentData;
		if (!schema?.preview?.select?.title) {
			return source.title || `Untitled`;
		}
		return source[schema.preview.select.title] || `Untitled`;
	}

	// CRITICAL: Clear state IMMEDIATELY when switching documents to prevent cross-contamination
	$effect(() => {
		// This effect runs first - watching documentId and documentType
		const _docId = documentId;
		const _docType = documentType;

		cmsLogger.debug('[Document Editor]', 'hasValidationErrors: ', hasValidationErrors);

		// Detect if we're actually switching documents vs just transitioning from creating→editing
		const isSwitchingDocuments =
			previousDocumentId !== undefined && // Not first render
			previousDocumentType !== undefined &&
			(previousDocumentType !== _docType || // Different document type
				(previousDocumentId !== null && previousDocumentId !== _docId)); // Different document ID (but not create→edit)

		// Only clear state if actually switching documents
		if (isSwitchingDocuments) {
			// Clear all state immediately to prevent old data from being auto-saved
			documentData = {};
			fullDocument = null;
			initialDocumentData = null;
			hasUnsavedChanges = false;
			saveError = null;
			lastSaved = null;
			publishSuccess = null;
			perspective = 'draft';
			publishedData = null;
			previewingVersion = null;

			// Cancel pending auto-save
			if (autoSaveTimer) {
				clearTimeout(autoSaveTimer);
				autoSaveTimer = null;
			}

			cmsLogger.debug(
				'[Document Editor]',
				'🧹 Cleared state for document switch:',
				_docType,
				_docId || 'new'
			);
		}

		// Update tracking
		previousDocumentId = _docId;
		previousDocumentType = _docType;
	});

	// Load schema when documentType is available or when switching to create mode
	$effect(() => {
		if (documentType) {
			loadSchema();
		}
	});

	// Load existing document data when editing
	$effect(() => {
		if (!isCreating && documentId) {
			// Skip loading if we just created this document (data is already in memory)
			if (justCreatedDocument) {
				cmsLogger.debug(
					'[Document Editor]',
					'⏭️  Skipping loadDocumentData - just created document'
				);
				justCreatedDocument = false;
				return;
			}
			loadDocumentData();
		}
	});

	// Initialize new document with field defaults
	$effect(() => {
		if (isCreating && schema) {
			initializeDocument();
		}
	});

	// Check for orphaned fields when document data or schema changes
	$effect(() => {
		if (documentData && schema && Object.keys(documentData).length > 0) {
			const cleanupResult = findOrphanedFields(documentData, schema);
			orphanedFields = cleanupResult.orphanedFields;
			showOrphanedFields = cleanupResult.hasOrphanedFields;
		}
	});

	function loadSchema() {
		schemaLoading = true;
		schemaError = null;

		cmsLogger.debug('[Document Editor]', 'RUNNING LOAD SCHEMA');
		cmsLogger.debug('[Document Editor]', 'SCHEMAS: ', schemas);

		try {
			// Find schema from provided schemas
			const foundSchema = schemas.find((s) => s.name === documentType);

			if (foundSchema) {
				schema = foundSchema;
			} else {
				throw new Error(`Schema type '${documentType}' not found`);
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to load schema');
			schemaError = err instanceof Error ? err.message : 'Failed to load schema';
		} finally {
			schemaLoading = false;
		}
	}

	async function loadDocumentData() {
		if (!documentId) return;

		cmsLogger.debug('[Document Editor]', '📄 Loading document data for:', documentId);

		try {
			const response = await documents.getById(documentId);

			if (response.success && response.data) {
				// Store full document for hash comparison
				fullDocument = response.data;

				// With LocalAPI, data is flattened at top level (not in draftData)
				// Extract all fields except id and _meta
				const { id: _id, _meta, ...data } = response.data;
				cmsLogger.debug('[Document Editor', '📄 Full response.data:', _id);
				cmsLogger.debug('[Document Editor]', '📄 Full response.data:', response.data);
				cmsLogger.debug('[Document Editor]', '📄 Extracted data (after destructuring):', data);
				cmsLogger.debug('[Document Editor]', '📄 Keys in extracted data:', Object.keys(data));
				cmsLogger.debug('[Document Editor]', '📄 Published hash:', _meta?.publishedHash);

				documentData = { ...data };
				cmsLogger.debug('[Document Editor]', '📄 documentData after assignment:', documentData);
				cmsLogger.debug('[Document Editor]', '📄 Keys in documentData:', Object.keys(documentData));
				hasUnsavedChanges = false; // Just loaded, so no unsaved changes

				// Run validation on loaded document to show any existing errors
				await tick(); // Wait for DOM to update with new data
				schemaFields.forEach((fieldComponent, index) => {
					const field = schema?.fields[index];
					if (fieldComponent && field) {
						fieldComponent.performValidation(documentData[field.name], documentData);
					}
				});
			} else {
				cmsLogger.debug('[Document Editor]', '❌ Failed to load document data:', response.error);
				saveError = response.error || 'Failed to load document';
			}
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : 'Failed to load document');
			saveError = err instanceof ApiError ? err.message : 'Failed to load document';
		}
	}

	async function initializeDocument() {
		if (!schema) return;

		cmsLogger.debug('[Document Editor]', '🆕 Initializing new document with field defaults');

		// Initialize document data with field defaults
		const initialData: Record<string, any> = {};

		for (const field of schema.fields) {
			if ('initialValue' in field && field.initialValue !== undefined) {
				// Resolve initialValue if it's a function
				if (typeof field.initialValue === 'function') {
					try {
						initialData[field.name] = await field.initialValue();
					} catch {
						toast.error(`Failed to resolve initial value for "${field.name}"`);
						// Fall back to default value for the field type
						initialData[field.name] = getDefaultValueForFieldType(field.type);
					}
				} else {
					// Use literal initialValue
					initialData[field.name] = field.initialValue;
				}
			} else if (field.type === 'boolean') {
				// Boolean fields default to false if no initialValue
				initialData[field.name] = false;
			} else if (field.type === 'array') {
				// Array fields default to empty array
				initialData[field.name] = [];
			} else if (field.type === 'object') {
				// Object fields default to empty object
				initialData[field.name] = {};
			} else if (field.type === 'number') {
				// Number fields default to null (not 0, which is a valid value)
				initialData[field.name] = null;
			} else {
				// String and other fields default to empty string
				initialData[field.name] = '';
			}
		}

		documentData = initialData;
		initialDocumentData = structuredClone(initialData);
		fullDocument = null;
		hasUnsavedChanges = false;
		lastSaved = null;
		saveError = null;
		cmsLogger.debug('[Document Editor]', '✅ Document initialized with:', initialData);
	}

	// Check if current data differs from last saved draft (or initial defaults for a new doc)
	function hasChangesFromSaved(): boolean {
		const baseline = fullDocument
			? (() => {
					const { id: _id, _meta, ...savedData } = fullDocument;
					return savedData;
				})()
			: initialDocumentData;

		if (!baseline) return true;

		const currentJson = JSON.stringify(sortObjectForComparison(documentData));
		const baselineJson = JSON.stringify(sortObjectForComparison(baseline));

		return currentJson !== baselineJson;
	}

	// Helper to recursively sort object keys for stable comparison
	// Strips _key fields since those are auto-generated and not real content changes
	function sortObjectForComparison(item: any): any {
		if (item === null || typeof item !== 'object') return item;

		if (Array.isArray(item)) {
			return item.map(sortObjectForComparison);
		}

		const { _key, ...rest } = item;
		item = rest;

		const sortedKeys = Object.keys(item).sort();
		const sortedObj: any = {};
		for (const key of sortedKeys) {
			sortedObj[key] = sortObjectForComparison(item[key]);
		}
		return sortedObj;
	}

	// Watch for changes to trigger auto-save (debounced)
	$effect(() => {
		const hasChanges = hasChangesFromSaved();

		hasUnsavedChanges = hasChanges;

		if (autoSaveTimer) {
			clearTimeout(autoSaveTimer);
		}

		// Debounced auto-save. Comparing against the initial-defaults snapshot (for new
		// docs) or the saved draft (for existing docs) means any real user edit triggers
		// save — including unchecking a boolean or clearing a field.
		if (hasChanges && schema && canWriteCurrentDoc) {
			autoSaveTimer = setTimeout(() => {
				cmsLogger.debug(
					'[Document Editor]',
					'🔄 Auto-saving after typing pause (data changed)...',
					{
						documentId
					}
				);
				saveDocument(true); // auto-save
			}, 1200); // Shorter delay - saves faster but still waits for typing pauses
		} else if (!hasChanges) {
			cmsLogger.debug('[Document Editor]', '⏭️  Skipping auto-save - no changes from saved data');
		}

		return () => {
			if (autoSaveTimer) {
				clearTimeout(autoSaveTimer);
			}
		};
	});

	async function saveDocument(isAutoSave = false) {
		if (saving) return;

		saving = true;
		saveError = null;

		try {
			let response;

			// ALWAYS allow saving drafts (even with validation errors) - Sanity-style
			if (isCreating) {
				// Create new document
				cmsLogger.debug('[Document Editor]', '🔄 Creating new document with data:', {
					type: documentType,
					data: documentData
				});
				response = await documents.create({
					type: documentType,
					data: documentData
				});

				cmsLogger.debug('[Document Editor]', '📝 Document creation response:', response);

				if (response.success && response.data) {
					cmsLogger.debug(
						'[Document Editor]',
						'✅ Document created successfully with ID:',
						response.data.id
					);
					// Set flag to prevent loadDocumentData from overwriting our data
					justCreatedDocument = true;
					// Store the response data for hash comparison
					fullDocument = response.data;
					// Always call onSaved to switch to edit mode after creation
					onSaved?.(response.data.id);
				} else {
					toast.error(response?.error || 'Failed to create document');
				}
			} else if (documentId) {
				// Update existing document
				response = await documents.updateById(documentId, {
					data: documentData
				});

				// Update fullDocument with the response to keep saved data in sync
				// We need to sync fullDocument to match what we just saved (documentData)
				// instead of what the server returned, in case server adds extra metadata
				if (response?.success && response.data) {
					cmsLogger.debug('[Document Editor]', 'meta response data:', response.data);
					const { id: responseId, _meta } = response.data;
					// Reconstruct fullDocument using the data we sent (documentData)
					// plus the id and _meta from the response
					fullDocument = {
						id: responseId,
						_meta,
						...documentData
					};
				}
			}

			if (response?.success) {
				lastSaved = new Date();
				hasUnsavedChanges = false;
				if (response.data?.id) notifyDocumentChanged(response.data.id);
				if (presentationMode && iframeRef?.contentWindow) {
					iframeRef.contentWindow.postMessage({ type: 'aphex:refresh' }, '*');
				}
				if (isAutoSave) {
					// Trigger validation on all fields after auto-save
					validateAllFields(); // Update validation status
					schemaFields.forEach((fieldComponent, index) => {
						const field = schema?.fields[index];
						if (fieldComponent && field) {
							fieldComponent.performValidation(documentData[field.name], {});
						}
					}); // Notify parent of autosave with current title
					if (onAutoSaved && documentId) {
						onAutoSaved(documentId, getPreviewTitle());
					}
				}
				if (showVersionHistory) {
					loadVersions();
				}
			} else {
				throw new Error(response?.error || 'Failed to save document');
			}
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : 'Failed to save document');

			// Extract validation errors if present
			if (err instanceof ApiError && err.response?.validationErrors) {
				const validationErrors = err.response.validationErrors;
				const errorMessages = validationErrors
					.map((ve: any) => `${ve.field}: ${ve.errors.join(', ')}`)
					.join('; ');
				saveError = `Validation failed: ${errorMessages}`;
			} else {
				saveError = err instanceof ApiError ? err.message : 'Failed to save document';
			}
		} finally {
			saving = false;
		}
	}

	async function publishDocument() {
		if (!documentId || saving) return;

		// Flush any pending debounced autosave so we publish the user's latest
		// edits, not the previously-saved draft.
		if (autoSaveTimer) {
			clearTimeout(autoSaveTimer);
			autoSaveTimer = null;
		}
		if (hasUnsavedChanges) {
			await saveDocument(false);
			if (saveError) return;
		}

		// Check for validation errors before publishing (Sanity-style)
		const invalid = await validateAllFields();

		if (invalid.length > 0) {
			// Show up to three field titles in the toast so the user doesn't
			// have to hunt for the red outline — longer lists are summarised.
			const preview = invalid
				.slice(0, 3)
				.map((f) => f.title)
				.join(', ');
			const remainder = invalid.length > 3 ? ` and ${invalid.length - 3} more` : '';
			const detail = invalid.map((f) => `${f.title}: ${f.messages.join(', ')}`).join('\n');

			saveError = `Cannot publish — fix: ${preview}${remainder}`;
			toast.error(`Fix ${invalid.length} field${invalid.length === 1 ? '' : 's'} to publish`, {
				description: detail
			});
			return;
		}

		// Referential integrity guard: every referenced document must itself be
		// published. Without this, publishing a doc that points at drafts would
		// expose dangling references in the published perspective. One batched
		// HTTP call regardless of ref count.
		const refIds = collectReferenceIds(documentData, schema, schemas);
		if (refIds.length > 0) {
			let fetched: any[] = [];
			try {
				const res = await documents.getMany(refIds);
				if (res.success && res.data) fetched = res.data;
			} catch {
				// fall through — missing fetched IDs become "blockers" below
			}
			const fetchedById = new Map(fetched.map((d) => [d.id, d]));
			const checks = refIds.map((id) => ({ id, doc: fetchedById.get(id) ?? null }));
			const blockers = checks.filter((c) => !c.doc || (c.doc as any)._meta?.status !== 'published');
			if (blockers.length > 0) {
				const titles = blockers
					.slice(0, 3)
					.map((b) => {
						if (!b.doc) return `Missing (${b.id.slice(0, 8)})`;
						const d = b.doc as any;
						const label = d.title ?? d.name ?? d.heading ?? d.label ?? b.id;
						const type = d._meta?.type;
						return type ? `"${label}" (${type})` : `"${label}"`;
					})
					.join(', ');
				const remainder = blockers.length > 3 ? ` and ${blockers.length - 3} more` : '';
				saveError = `Cannot publish — unpublished references: ${titles}${remainder}`;
				toast.error(
					`${blockers.length} referenced document${blockers.length === 1 ? '' : 's'} ${blockers.length === 1 ? 'is' : 'are'} not published`,
					{
						description: 'Publish the referenced documents first, then try again.'
					}
				);
				return;
			}
		}

		saving = true;
		saveError = null;

		try {
			const response = await documents.publish(documentId);

			if (response.success && response.data) {
				// Update local state with new published hash. Sync documentData from
				// the response too — the server normalises data (e.g. dates) before
				// hashing for the published_hash, so the client must use the same
				// normalised values, otherwise hasUnpublishedChanges always returns
				// true and the publish button never disables.
				const { id: _id, _meta: _m, ...syncedData } = response.data as any;
				documentData = syncedData;
				fullDocument = response.data;
				lastSaved = new Date();
				publishSuccess = new Date();
				notifyDocumentChanged(documentId);
				cmsLogger.debug('[Document Editor]', '✅ Document published successfully');
				cmsLogger.debug('[Document Editor]', '📄 New published hash:', response.data.publishedHash);

				// Notify parent that document was published
				if (onPublished && documentId) {
					onPublished(documentId);
				}
				if (showVersionHistory) {
					loadVersions();
				}
			} else {
				throw new Error(response.error || 'Failed to publish document');
			}
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : 'Failed to publish document');

			// Extract validation errors if present
			if (err instanceof ApiError && err.response?.validationErrors) {
				const validationErrors = err.response.validationErrors;
				const errorMessages = validationErrors
					.map((ve: any) => `${ve.field}: ${ve.errors.join(', ')}`)
					.join('; ');
				saveError = `Cannot publish - Validation failed: ${errorMessages}`;
			} else {
				saveError = err instanceof ApiError ? err.message : 'Failed to publish document';
			}
		} finally {
			saving = false;
		}
	}

	async function switchPerspective(newPerspective: 'draft' | 'published') {
		if (newPerspective === perspective) return;

		if (newPerspective === 'published') {
			if (!documentId) return;
			// Fetch published version of the document
			try {
				const response = await documents.getById(`${documentId}?perspective=published`);
				if (response.success && response.data) {
					publishedData = response.data;
					perspective = 'published';
				} else {
					toast.error('No published version available');
				}
			} catch {
				toast.error('Failed to load published version');
			}
		} else {
			perspective = 'draft';
			publishedData = null;
		}
	}

	async function unpublishDocument() {
		if (!documentId || saving) return;

		// Surface published back-references so the user knows what will end up
		// with dangling refs in the published perspective. Best-effort —
		// network errors fall through to the standard confirm.
		let backRefDescription =
			'It will be removed from published queries, but the data is preserved and you can re-publish anytime.';
		try {
			const backRefRes = await documents.getBackReferences(documentId);
			if (backRefRes.success && backRefRes.data) {
				const publishedBackRefs = backRefRes.data.filter((r) => r.status === 'published');
				if (publishedBackRefs.length > 0) {
					const count = publishedBackRefs.length;
					backRefDescription = `${count} published document${count === 1 ? '' : 's'} reference${count === 1 ? 's' : ''} this one — their references will be left dangling in the published perspective until you re-publish them. Continue?`;
				}
			}
		} catch {
			// Silently fall through to the generic confirm; ref index may be unpopulated.
		}

		const confirmUnpublish = await confirmDialog({
			title: 'Unpublish this document?',
			description: backRefDescription,
			confirmText: 'Unpublish',
			variant: 'destructive'
		});
		if (!confirmUnpublish) return;

		saving = true;
		saveError = null;

		try {
			const response = await documents.unpublish(documentId);
			if (response.success) {
				fullDocument = {
					...fullDocument,
					_meta: { ...fullDocument?._meta, status: 'unpublished' }
				};
				notifyDocumentChanged(documentId);
				toast.success('Document unpublished — you can re-publish anytime');
				if (onUnpublished && documentId) {
					onUnpublished(documentId);
				}
			} else {
				throw new Error(response.error || 'Failed to unpublish');
			}
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : 'Failed to unpublish document');
		} finally {
			saving = false;
		}
	}

	// Validate all fields before publishing
	async function validateAllFields(): Promise<
		Array<{ name: string; title: string; messages: string[] }>
	> {
		if (!schema) {
			hasValidationErrors = false;
			return [];
		}

		const invalid: Array<{ name: string; title: string; messages: string[] }> = [];

		for (const field of schema.fields) {
			if (field.validation) {
				try {
					const validationFunctions = Array.isArray(field.validation)
						? field.validation
						: [field.validation];

					const messages: string[] = [];
					for (const validationFn of validationFunctions) {
						const rule = validationFn(new Rule());
						const markers = await rule.validate(documentData[field.name], { path: [field.name] });

						for (const m of markers) {
							if (m.level === 'error') messages.push(m.message ?? 'Invalid');
						}
					}

					if (messages.length > 0) {
						invalid.push({ name: field.name, title: field.title ?? field.name, messages });
						cmsLogger.debug(
							`[DocumentEditor] Validation error in field '${field.name}':`,
							messages
						);
					}
				} catch {
					invalid.push({
						name: field.name,
						title: field.title ?? field.name,
						messages: ['Validation check threw an error']
					});
					toast.error(`Validation failed for field "${field.title ?? field.name}"`);
				}
			}
		}

		hasValidationErrors = invalid.length > 0;
		return invalid;
	}

	async function deleteDocument() {
		if (!documentId || saving) return;

		const confirmDelete = await confirmDialog({
			title: 'Delete this document?',
			description: 'This action cannot be undone.',
			confirmText: 'Delete',
			variant: 'destructive'
		});
		if (!confirmDelete) return;

		saving = true;
		saveError = null;

		try {
			const response = await documents.deleteById(documentId);

			if (response.success) {
				cmsLogger.debug('[Document Editor]', '✅ Document deleted successfully');
				onDeleted?.();
			} else {
				throw new Error(response.error || 'Failed to delete document');
			}
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : 'Failed to delete document');
			saveError = err instanceof ApiError ? err.message : 'Failed to delete document';
		} finally {
			saving = false;
		}
	}

	// Schema cleanup functions
	function removeOrphanedField(fieldToRemove: OrphanedField) {
		// Deep clone to ensure nested object changes trigger reactivity
		const newData = JSON.parse(JSON.stringify(documentData));

		if (fieldToRemove.level === 'document') {
			delete newData[fieldToRemove.key];
		} else {
			// Handle nested field removal (more complex path-based deletion)
			removeFieldByPath(newData, fieldToRemove.path);
		}

		documentData = newData;
		hasUnsavedChanges = true;

		// Remove from orphaned fields list
		orphanedFields = orphanedFields.filter((f) => f !== fieldToRemove);

		// Hide warning if no more orphaned fields
		if (orphanedFields.length === 0) {
			showOrphanedFields = false;
		}
	}

	function removeFieldByPath(obj: any, path: string) {
		const parts = path.split('.');
		let current = obj;

		for (let i = 0; i < parts.length - 1; i++) {
			const part = parts[i]!;
			if (part.includes('[') && part.includes(']')) {
				// Handle array index like "items[0]"
				const [key, indexStr] = part.split('[');
				const index = parseInt(indexStr!.replace(']', ''));
				current = current[key!][index];
			} else {
				current = current[part];
			}
		}

		const lastPart = parts[parts.length - 1]!;
		delete current[lastPart];
	}

	function cleanupAllOrphanedFields() {
		if (!schema) return;

		const cleanupResult = findOrphanedFields(documentData, schema);
		documentData = cleanupResult.cleanedData;
		hasUnsavedChanges = true;
		showOrphanedFields = false;
		orphanedFields = [];
	}

	function dismissOrphanedFields() {
		showOrphanedFields = false;
	}
</script>

<div class="relative flex h-full w-full min-w-0 flex-col overflow-hidden">
	<!-- Hero Header -->
	<div class="bg-background w-full min-w-0 overflow-x-clip px-4 pt-4 pb-5 lg:px-6 lg:pt-5">
		<div class="w-full">
			<!-- Top row: breadcrumb + actions -->
			<div class="mb-4 flex items-center justify-between gap-3">
				<div
					class="text-muted-foreground flex min-w-0 items-center gap-2 text-[11px] font-medium tracking-wider uppercase"
				>
					<span class="whitespace-nowrap">{schema?.title || documentType}</span>
					<span aria-hidden="true">·</span>
					<span class="truncate">{getPreviewTitle()}</span>
				</div>

				<div class="flex shrink-0 items-center gap-2">
					{#if saving}
						<span
							class="text-muted-foreground hidden items-center gap-1.5 text-[10px] font-medium tracking-wider whitespace-nowrap uppercase sm:inline-flex"
						>
							<span class="bg-muted-foreground/60 h-1.5 w-1.5 animate-pulse rounded-full"></span>
							Saving
						</span>
					{:else if hasUnsavedChanges}
						<span
							class="text-muted-foreground hidden items-center gap-1.5 text-[10px] font-medium tracking-wider whitespace-nowrap uppercase sm:inline-flex"
						>
							<span class="bg-muted-foreground/60 h-1.5 w-1.5 rounded-full"></span>
							Unsaved
						</span>
					{:else if savedAgoText}
						<span
							class="text-muted-foreground hidden items-center gap-1.5 text-[10px] font-medium tracking-wider whitespace-nowrap uppercase sm:inline-flex"
						>
							<span class="bg-muted-foreground/60 h-1.5 w-1.5 rounded-full"></span>
							Auto-saved
						</span>
					{/if}

					{#if documentId && fullDocument?._meta?.publishedHash}
						{@const isPublished =
							fullDocument?._meta?.status === 'published' && fullDocument?._meta?.publishedAt}
						{@const isUnpub = fullDocument?._meta?.status === 'unpublished'}
						<div class="flex items-center gap-1.5">
							<button
								class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-wider uppercase transition-colors {perspective ===
								'draft'
									? 'bg-primary/90 text-primary-foreground border-transparent'
									: 'text-muted-foreground hover:bg-muted'}"
								onclick={() => switchPerspective('draft')}
							>
								<span
									class="bg-muted-foreground/60 h-1.5 w-1.5 rounded-full {perspective === 'draft'
										? 'bg-primary-foreground/60'
										: ''}"
								></span>
								Draft
							</button>
							<button
								class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-wider uppercase transition-colors {perspective ===
								'published'
									? 'bg-primary text-primary-foreground border-transparent'
									: 'text-muted-foreground hover:bg-muted'}"
								onclick={() => switchPerspective('published')}
							>
								{#if isPublished}
									<span
										class="h-1.5 w-1.5 rounded-full {perspective === 'published'
											? 'bg-primary-foreground/60'
											: 'bg-green-500'}"
									></span>
									Published · {timeAgo(new Date(fullDocument._meta.publishedAt))}
								{:else if isUnpub}
									<span
										class="h-1.5 w-1.5 rounded-full {perspective === 'published'
											? 'bg-primary-foreground/60'
											: 'bg-muted-foreground/60'}"
									></span>
									Unpublished
								{:else}
									Published
								{/if}
							</button>
						</div>
					{/if}

					{#if documentId}
						<div class="relative">
							<Button
								variant="ghost"
								size="icon"
								onclick={() => (showHeaderMenu = !showHeaderMenu)}
								class="h-8 w-8 cursor-pointer"
							>
								<Ellipsis class="h-4 w-4" />
							</Button>
							{#if showHeaderMenu}
								<div
									class="bg-background border-rule absolute top-full right-0 z-[60] mt-1 min-w-[160px] rounded-md border py-1 shadow-lg"
								>
									<button
										onclick={() => {
											showHeaderMenu = false;
											if (onOpenVersionHistory && documentId) {
												onOpenVersionHistory(documentId);
											} else {
												showVersionHistory = true;
											}
										}}
										class="hover:bg-muted flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
									>
										<History class="h-3.5 w-3.5" /> History
									</button>
									<button
										onclick={() => {
											showHeaderMenu = false;
											showInspect = true;
										}}
										class="hover:bg-muted flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
									>
										<Code class="h-3.5 w-3.5" /> Inspect
									</button>
								</div>
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div class="fixed inset-0 z-[55]" onclick={() => (showHeaderMenu = false)}></div>
							{/if}
						</div>
					{/if}

					{#if onTogglePresentation && schema?.previewUrl}
						<Button
							variant="ghost"
							size="icon"
							onclick={onTogglePresentation}
							class="hidden h-8 w-8 hover:cursor-pointer lg:flex {presentationMode
								? 'text-primary'
								: ''}"
							title={presentationMode ? 'Exit presentation mode' : 'Present'}
						>
							<Monitor class="h-4 w-4" />
						</Button>
					{/if}

					{#if onToggleFocus}
						<Button
							variant="ghost"
							size="icon"
							onclick={onToggleFocus}
							class="hidden h-8 w-8 hover:cursor-pointer lg:flex"
							title={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
						>
							{#if focusMode}
								<Minimize2 class="h-4 w-4" />
							{:else}
								<Maximize2 class="h-4 w-4" />
							{/if}
						</Button>
					{/if}

					<Button
						variant="ghost"
						size="icon"
						onclick={onBack}
						class="hidden h-8 w-8 hover:cursor-pointer lg:flex"
						title="Close"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</Button>
				</div>
			</div>

			<!-- Title -->
			<h1 class="block w-full min-w-0 truncate text-3xl font-semibold tracking-tight">
				{getPreviewTitle()}
			</h1>

			<!-- Mobile-only status row: save state + draft pill for narrow viewports -->
			<div class="mt-3 flex items-center justify-between gap-3 sm:hidden">
				<div class="flex flex-wrap items-center gap-2">
					{#if !fullDocument?._meta?.publishedHash && documentId && fullDocument?._meta?.status !== 'unpublished'}
						<span
							class="text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-wider uppercase"
						>
							<span class="bg-muted-foreground/60 h-1.5 w-1.5 rounded-full"></span>
							Draft
						</span>
					{/if}
				</div>

				{#if saving}
					<span
						class="text-muted-foreground inline-flex items-center gap-1.5 text-[10px] font-medium tracking-wider whitespace-nowrap uppercase"
					>
						<span class="bg-muted-foreground/60 h-1.5 w-1.5 animate-pulse rounded-full"></span>
						Saving
					</span>
				{:else if hasUnsavedChanges}
					<span
						class="text-muted-foreground inline-flex items-center gap-1.5 text-[10px] font-medium tracking-wider whitespace-nowrap uppercase"
					>
						<span class="bg-muted-foreground/60 h-1.5 w-1.5 rounded-full"></span>
						Unsaved
					</span>
				{:else if savedAgoText}
					<span
						class="text-muted-foreground inline-flex items-center gap-1.5 text-[10px] font-medium tracking-wider whitespace-nowrap uppercase"
					>
						<span class="bg-muted-foreground/60 h-1.5 w-1.5 rounded-full"></span>
						Auto-saved
					</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Content Form -->
	<div
		data-document-editor
		class="relative flex min-h-0 flex-1 {presentationMode ? 'flex-row' : 'flex-col'}"
	>
		<div
			class="{presentationMode
				? 'shrink-0 overflow-y-auto'
				: 'flex flex-1 flex-col overflow-auto'} p-4 lg:p-6"
			style={presentationMode ? `width: ${fieldsWidth}px; min-width: 500px` : undefined}
		>
			<div class="flex w-full flex-1 flex-col gap-4 lg:gap-6">
				{#if saveError}
					<div class="bg-destructive/10 border-destructive/20 rounded-md border p-3">
						<p class="text-destructive text-sm">{saveError}</p>
					</div>
				{/if}

				{#if schemaError}
					<div class="bg-destructive/10 border-destructive/20 rounded-md border p-3">
						<p class="text-destructive text-sm">Schema Error: {schemaError}</p>
					</div>
				{:else if schemaLoading}
					<div class="p-6 text-center">
						<div class="text-muted-foreground text-sm">Loading schema...</div>
					</div>
				{:else if schema}
					<!-- Orphaned Fields Warning -->
					{#if showOrphanedFields && orphanedFields.length > 0}
						<div class="space-y-3 rounded-md border border-orange-200 bg-orange-50 p-4">
							<div class="flex items-center gap-2">
								<svg
									class="h-5 w-5 text-orange-600"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.081 16.5c-.77.833.192 2.5 1.732 2.5z"
									/>
								</svg>
								<h4 class="text-sm font-medium text-orange-800">
									{orphanedFields.length} orphaned field{orphanedFields.length === 1 ? '' : 's'} detected
								</h4>
							</div>

							<p class="text-sm text-orange-700">
								These fields exist in your document but are no longer defined in the schema:
							</p>

							<div class="space-y-2">
								{#each orphanedFields as field, index (index)}
									<div
										class="flex items-center justify-between rounded border border-orange-200 bg-white p-3"
									>
										<div class="flex-1">
											<div class="font-mono text-sm font-medium text-orange-800">
												{field.path || field.key}
											</div>
											<div class="mt-1 text-xs text-orange-600">
												<code class="rounded bg-orange-100 px-1">{JSON.stringify(field.value)}</code
												>
											</div>
										</div>
										<Button
											size="sm"
											variant="outline"
											onclick={() => removeOrphanedField(field)}
											class="ml-3 h-8 border-red-200 px-3 text-red-600 hover:border-red-300 hover:bg-red-50"
										>
											Remove
										</Button>
									</div>
								{/each}
							</div>

							<div class="flex gap-2 border-t border-orange-200 pt-2">
								<Button
									size="sm"
									variant="outline"
									onclick={cleanupAllOrphanedFields}
									class="border-orange-600 bg-orange-600 text-white hover:bg-orange-700"
								>
									Remove All
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onclick={dismissOrphanedFields}
									class="text-orange-700 hover:text-orange-800"
								>
									Dismiss
								</Button>
							</div>
						</div>
					{/if}

					<!-- Field Group Tabs -->
					{#if schema.groups && schema.groups.length > 0}
						{@const visibleGroups = schema.groups.filter((g) => !g.hidden)}
						<div class="mb-4 flex items-center gap-1 overflow-x-auto py-1">
							<button
								type="button"
								onclick={() => (activeGroup = 'all')}
								class="cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors {activeGroup ===
								'all'
									? 'bg-muted text-foreground'
									: 'text-muted-foreground hover:text-foreground'}"
							>
								All fields
							</button>
							{#each visibleGroups as group (group.name)}
								<button
									type="button"
									onclick={() => (activeGroup = group.name)}
									class="flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors {activeGroup ===
									group.name
										? 'bg-muted text-foreground'
										: 'text-muted-foreground hover:text-foreground'}"
								>
									{#if group.icon}
										{@const Icon = group.icon}
										<Icon class="h-4 w-4" />
									{/if}
									{group.title}
								</button>
							{/each}
						</div>
					{/if}

					<!-- Dynamic Schema Fields -->
					<svelte:boundary
						onerror={(error) =>
							cmsLogger.error('[DocumentEditor]', 'Error in editor content:', error)}
					>
						{#each schema.fields.filter((f) => fieldInGroup(f, activeGroup) && !hiddenFieldNames.has(f.name)) as field (field.name)}
							{@const viewData =
								isPreviewingVersion && activePreview
									? activePreview.data
									: isViewingPublished && publishedData
										? publishedData
										: documentData}
							<div
								data-field-name={field.name}
								class="rounded-md transition-all duration-300 {focusedFieldName === field.name
									? 'ring-primary/40 ring-2 ring-offset-2'
									: ''}"
							>
								<SchemaField
									{field}
									value={viewData[field.name]}
									documentData={viewData}
									onUpdate={(newValue) => {
										if (isViewingPublished) return;
										documentData = { ...documentData, [field.name]: newValue };
										hasUnsavedChanges = true;
									}}
									{onOpenReference}
									schemaType={documentType}
									readonly={isReadOnly ||
										isViewingPublished ||
										isPreviewingVersion ||
										isFieldReadonly(field.name)}
									organizationId={fullDocument?._meta?.organizationId}
								/>
							</div>
						{/each}

						{#snippet failed(error, reset)}
							<div class="border-destructive/30 bg-destructive/5 rounded-md border p-4 text-center">
								<p class="text-destructive font-medium">Document editor encountered an error</p>
								<p class="text-muted-foreground mt-1 text-sm">
									{error instanceof Error ? error.message : 'Unknown error'}
								</p>
								<button
									class="bg-primary text-primary-foreground mt-3 rounded px-4 py-2 text-sm"
									onclick={reset}
								>
									Reload editor
								</button>
							</div>
						{/snippet}
					</svelte:boundary>
				{:else}
					<div class="border-muted-foreground/30 rounded-md border border-dashed p-4">
						<p class="text-muted-foreground text-center text-sm">
							No schema found for document type: {documentType}
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Preview iframe (presentation mode only) -->
		{#if presentationMode}
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<!-- Drag handle -->
			<div
				role="separator"
				aria-orientation="vertical"
				class="hover:bg-primary/20 active:bg-primary/30 w-1 shrink-0 cursor-ew-resize transition-colors"
				onmousedown={startResize}
			></div>
			<div class="flex min-h-0 flex-1 flex-col">
				{#if iframeUrl}
					<!-- Preview toolbar -->
					<div
						class="border-rule bg-background flex h-10 shrink-0 items-center gap-1 border-b px-2"
					>
						<!-- Edit toggle -->
						<button
							onclick={() => {
								previewEditMode = !previewEditMode;
								iframeRef?.contentWindow?.postMessage(
									{ type: 'aphex:edit-mode', enabled: previewEditMode },
									'*'
								);
							}}
							class="hover:bg-muted flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 transition-colors"
							title={previewEditMode ? 'Disable edit mode' : 'Enable edit mode'}
						>
							<!-- Toggle pill -->
							<div
								class="relative h-[14px] w-6 rounded-full transition-colors {previewEditMode
									? 'bg-primary'
									: 'bg-muted-foreground/30'}"
							>
								<div
									class="absolute top-[2px] h-[10px] w-[10px] rounded-full bg-white shadow transition-all {previewEditMode
										? 'left-[12px]'
										: 'left-[2px]'}"
								></div>
							</div>
							<span
								class="text-[11px] font-medium tracking-wide {previewEditMode
									? 'text-foreground'
									: 'text-muted-foreground'}">Edit</span
							>
						</button>

						<!-- Refresh -->
						<button
							onclick={refreshPreview}
							class="hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer rounded p-1.5 transition-colors"
							title="Refresh preview"
						>
							<RefreshCw class="h-3.5 w-3.5" />
						</button>

						<!-- URL bar -->
						<div class="bg-muted mx-1 min-w-0 flex-1 rounded px-2.5 py-1">
							<span class="text-muted-foreground block truncate text-center font-mono text-[11px]"
								>{iframeUrl}</span
							>
						</div>

						<!-- Open in new tab -->
						<button
							onclick={openPreviewInNewTab}
							class="hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer rounded p-1.5 transition-colors"
							title="Open in new tab"
						>
							<ExternalLink class="h-3.5 w-3.5" />
						</button>
					</div>

					<div class="relative min-h-0 flex-1">
						<iframe
							bind:this={iframeRef}
							src={iframeUrl}
							class="h-full w-full border-none"
							title="Page preview"
						></iframe>
						{#if isResizing}
							<div class="absolute inset-0"></div>
						{/if}
					</div>
				{:else}
					<div class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
						<Monitor class="text-muted-foreground/30 h-10 w-10" />
						<p class="text-muted-foreground text-sm">No preview URL yet.</p>
						<p class="text-muted-foreground/50 text-xs">
							Fill in the required fields to enable preview.
						</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Sanity-style bottom bar -->
	{#if documentId}
		<div class="border-rule bg-background relative z-50 border-t p-4">
			{#if isPreviewingVersion && activePreview}
				<!-- Version preview footer -->
				<div class="flex items-center justify-between">
					<p class="text-muted-foreground text-sm">
						Revision from {new Date(activePreview.createdAt || Date.now()).toLocaleString(
							undefined,
							{ month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }
						)}
					</p>
					<Button
						size="sm"
						onclick={async () => {
							if (!documentId || !activePreview) return;
							try {
								await documents.restoreVersion(documentId, activePreview.versionNumber);
								const docRes = await documents.getById(documentId);
								if (docRes.success && docRes.data) {
									const doc = docRes.data as Record<string, any>;
									fullDocument = doc;
									const newData: Record<string, any> = {};
									if (schema) {
										for (const field of schema.fields) {
											if (doc[field.name] !== undefined) {
												newData[field.name] = doc[field.name];
											}
										}
									}
									documentData = newData;
									hasUnsavedChanges = false;
									lastSaved = new Date();
								}
								previewingVersion = null;
								perspective = 'draft';
								publishedData = null;
								toast.success('Revision restored');
								if (onRestored && documentId) {
									onRestored(documentId);
								}
							} catch {
								toast.error('Failed to restore revision');
							}
						}}
					>
						Restore
					</Button>
				</div>
			{:else if isViewingPublished}
				<!-- Published view footer -->
				<div class="flex items-center justify-between">
					<p class="text-muted-foreground text-sm">
						{#if fullDocument?._meta?.status === 'unpublished'}
							Unpublished
						{:else}
							Published on {fullDocument?._meta?.publishedAt
								? new Date(fullDocument._meta.publishedAt).toLocaleString(undefined, {
										month: 'short',
										day: 'numeric',
										year: 'numeric',
										hour: 'numeric',
										minute: '2-digit',
										hour12: true
									})
								: 'Unknown'}
						{/if}
					</p>
					{#if fullDocument?._meta?.status === 'unpublished'}
						{#if canPublishDoc}
							<Button size="sm" onclick={publishDocument} disabled={saving}>Publish</Button>
						{/if}
					{:else if canUnpublishDoc}
						<Button size="sm" variant="secondary" onclick={unpublishDocument} disabled={saving}>
							Unpublish
						</Button>
					{/if}
				</div>
			{:else}
				<div class="flex items-center justify-between">
					<!-- Left: Transient publish confirmation (save/unsaved now shown in header) -->
					<div class="flex items-center gap-2">
						{#if publishSuccess && now - publishSuccess.getTime() < 3000}
							<Badge variant="default">Published!</Badge>
						{/if}
					</div>

					<!-- Right: Publish button + horizontal three dots menu -->
					<div class="flex items-center gap-2">
						{#if canPublishDoc && !isViewingPublished}
							<Button
								onclick={publishDocument}
								disabled={!canPublish}
								size="sm"
								variant={canPublish ? 'default' : 'secondary'}
								class="cursor-pointer"
							>
								{#if saving}
									Publishing...
								{:else if isUnpublished}
									Publish
								{:else if !hasUnpublishedContent}
									Published
								{:else}
									Publish Changes
								{/if}
							</Button>
						{:else if isViewingReadOnly}
							<Badge variant="secondary" class="text-xs">Read Only</Badge>
						{/if}

						{#if canDelete && !schema?.singleton}
							<Button
								variant="ghost"
								size="icon"
								class="text-muted-foreground hover:text-destructive h-8 w-8"
								onclick={deleteDocument}
								title="Delete document"
							>
								<Trash2 class="h-4 w-4" />
							</Button>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Version History Panel -->
	{#if showVersionHistory && documentId}
		<div class="absolute inset-0 z-50 flex">
			<!-- Backdrop -->
			<button
				class="flex-1 bg-black/30"
				onclick={() => {
					showVersionHistory = false;
					previewingVersion = null;
				}}
				aria-label="Close version history"
			></button>
			<!-- Panel -->
			<div class="bg-background border-rule flex w-80 flex-col border-l shadow-lg">
				<div class="border-rule flex items-center justify-between border-b px-4 py-3">
					<h3 class="text-sm font-medium">Version History</h3>
					<button
						class="hover:bg-muted rounded p-1 transition-colors"
						onclick={() => {
							showVersionHistory = false;
							previewingVersion = null;
						}}
						aria-label="Close version history"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
				<div class="flex-1 overflow-auto">
					{#if versionsLoading && versionsList.length === 0}
						<div class="p-4 text-center">
							<span class="text-muted-foreground text-sm">Loading versions...</span>
						</div>
					{:else if versionsError}
						<div class="p-4 text-center">
							<span class="text-destructive text-sm">Failed to load versions</span>
						</div>
					{:else if versionsList.length > 0}
						<div class="divide-y">
							{#each versionsList as version}
								<button
									class="hover:bg-muted w-full space-y-1 px-4 py-3 text-left transition-colors {previewingVersion?.versionNumber ===
									version.versionNumber
										? 'bg-muted border-l-primary border-l-2'
										: ''}"
									onclick={async () => {
										try {
											const res = await documents.getVersion(documentId, version.versionNumber);
											if (res.success && res.data) {
												previewingVersion = {
													versionNumber: version.versionNumber,
													data: res.data.data ?? {},
													eventType: version.eventType
												};
											}
										} catch {
											toast.error('Failed to load version');
										}
									}}
								>
									<div class="flex items-center gap-2">
										<span class="text-xs font-medium">v{version.versionNumber}</span>
										<Badge
											variant={version.eventType === 'publish'
												? 'default'
												: version.eventType === 'restore'
													? 'outline'
													: 'secondary'}
											class="text-[10px]"
										>
											{version.eventType}
										</Badge>
									</div>
									<p class="text-muted-foreground text-[11px]">
										{version.createdAt ? new Date(version.createdAt).toLocaleString() : ''}
									</p>
								</button>
							{/each}
						</div>
					{:else}
						<div class="p-4 text-center">
							<span class="text-muted-foreground text-sm">No versions yet</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Inspect Modal -->
	{#if showInspect}
		<div class="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
			<div
				class="bg-background border-rule mx-4 flex h-[80%] w-full max-w-3xl flex-col rounded-lg border shadow-xl"
			>
				<!-- Modal header -->
				<div class="flex items-center justify-between border-b px-4 py-3">
					<div>
						<h3 class="text-sm font-semibold">Inspecting <em>{getPreviewTitle()}</em></h3>
					</div>
					<Button
						variant="ghost"
						class="hover:bg-muted rounded p-1 transition-colors"
						onclick={() => (showInspect = false)}
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</Button>
				</div>

				<!-- Tabs -->
				<div class="flex items-center justify-between border-b">
					<div class="flex">
						<button
							class="px-4 py-2 text-sm font-medium transition-colors {inspectTab === 'parsed'
								? 'border-primary text-foreground border-b-2'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => (inspectTab = 'parsed')}
						>
							Parsed
						</button>
						<button
							class="px-4 py-2 text-sm font-medium transition-colors {inspectTab === 'raw'
								? 'border-primary text-foreground border-b-2'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => (inspectTab = 'raw')}
						>
							Raw JSON
						</button>
					</div>
					<div class="flex gap-1 pr-2">
						<button
							class="rounded px-2 py-1 text-xs font-medium transition-colors {inspectPerspective ===
							'draft'
								? 'bg-muted text-foreground'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => (inspectPerspective = 'draft')}
						>
							Draft
						</button>
						<button
							class="rounded px-2 py-1 text-xs font-medium transition-colors {inspectPerspective ===
							'published'
								? 'bg-muted text-foreground'
								: 'text-muted-foreground hover:text-foreground'}"
							onclick={() => (inspectPerspective = 'published')}
						>
							Published
						</button>
					</div>
				</div>

				<!-- Content -->
				<div class="flex-1 overflow-auto p-4 font-mono text-sm">
					{#if inspectPerspective === 'published' && !publishedData}
						<p class="text-muted-foreground text-sm">No published data available.</p>
					{:else}
						{@const inspectData =
							inspectPerspective === 'published' && publishedData
								? { id: documentId, _meta: fullDocument?._meta, ...publishedData }
								: { id: documentId, _meta: fullDocument?._meta, ...documentData }}
						{#if inspectTab === 'raw'}
							<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
							<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
							<pre
								class="text-xs break-all whitespace-pre-wrap select-text"
								tabindex="0"
								onkeydown={(e) => {
									if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
										e.preventDefault();
										e.stopPropagation();
										const sel = window.getSelection();
										const range = document.createRange();
										range.selectNodeContents(e.currentTarget);
										sel?.removeAllRanges();
										sel?.addRange(range);
									}
								}}>{@html syntaxHighlightJson(JSON.stringify(inspectData, null, 2))}</pre>
						{:else}
							{@render parsedValue(null, inspectData, 0)}
						{/if}
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

{#snippet parsedValue(key: string | null, val: any, depth: number)}
	{#if val && typeof val === 'object'}
		<details class="my-0.5" open={depth < 2}>
			<summary class="cursor-pointer text-xs leading-relaxed">
				{#if key !== null}
					{#if typeof key === 'number' || /^\d+$/.test(String(key))}
						<span class="text-purple-400">{key}:</span>
					{:else}
						<span class="text-blue-400">{key}:</span>
					{/if}
				{/if}
				{#if Array.isArray(val)}
					<span class="text-muted-foreground"
						>[...] {val.length} {val.length === 1 ? 'item' : 'items'}</span
					>
				{:else}
					<span class="text-muted-foreground"
						>&#123;...&#125; {Object.keys(val).length}
						{Object.keys(val).length === 1 ? 'property' : 'properties'}</span
					>
				{/if}
			</summary>
			<div class="border-rule/50 ml-4 border-l pl-3">
				{#if Array.isArray(val)}
					{#each val as item, i}
						{@render parsedValue(String(i), item, depth + 1)}
					{/each}
				{:else}
					{#each Object.entries(val) as [k, v]}
						{@render parsedValue(k, v, depth + 1)}
					{/each}
				{/if}
			</div>
		</details>
	{:else}
		<div class="my-0.5 text-xs leading-relaxed">
			{#if key !== null}
				<span class="text-blue-400">{key}:</span>
			{/if}
			{#if typeof val === 'string'}
				<span class="text-yellow-500">{val}</span>
			{:else if typeof val === 'number'}
				<span class="text-green-400">{val}</span>
			{:else if typeof val === 'boolean'}
				<span class="text-orange-400">{val}</span>
			{:else if val === null || val === undefined}
				<span class="text-red-400">null</span>
			{:else}
				<span class="text-muted-foreground">{JSON.stringify(val)}</span>
			{/if}
		</div>
	{/if}
{/snippet}
