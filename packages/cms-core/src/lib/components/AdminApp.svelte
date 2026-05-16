<script lang="ts">
	/**
	 * AdminApp - Complete CMS Admin Interface
	 * A packaged, reusable Sanity-style admin UI
	 */
	import { Alert, AlertDescription, AlertTitle } from '@aphexcms/ui/shadcn/alert';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import * as Tabs from '@aphexcms/ui/shadcn/tabs';
	import * as Popover from '@aphexcms/ui/shadcn/popover';
	import * as Select from '@aphexcms/ui/shadcn/select';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import type { SchemaType } from '../types/index';
	import type { UserSessionPreferences } from '../types/organization';
	import { resolvePreviewTitle, resolvePreviewSubtitle } from '../utils/preview';
	import DocumentEditor from './admin/DocumentEditor.svelte';
	import DocumentVersionPanel from './admin/DocumentVersionPanel.svelte';
	import DocumentsSkeleton from './admin/DocumentsSkeleton.svelte';
	import MediaBrowser from './admin/MediaBrowser.svelte';
	import ConfirmDialogHost from './admin/confirm-dialog/ConfirmDialogHost.svelte';
	import { documents, organizations } from '../api/index';
	import {
		FileText,
		Ellipsis,
		ArrowDownAZ,
		ArrowUpZA,
		ArrowDown01,
		ArrowUp10,
		ArrowDownUp,
		ChevronLeft,
		ChevronRight
	} from '@lucide/svelte';
	import type { Organization } from '../types/organization';
	import { getOrderingsForSchema } from '../utils/default-orderings';
	import { cmsLogger } from '../utils/logger';
	import { pluralize } from '../utils/pluralize';
	import { toast } from 'svelte-sonner';
	import { setPermissionsContext } from '../permissions-context.svelte';

	interface Props {
		schemas: SchemaType[];
		documentTypes: Array<{ name: string; title: string; description?: string }>;
		schemaError?: { message: string } | null;
		title?: string;
		graphqlSettings?: { endpoint: string; enableGraphiQL: boolean } | null;
		isReadOnly?: boolean;
		/**
		 * Capabilities resolved for the current session. Used for per-action UI
		 * gating. When absent, all actions are shown and the server remains the
		 * enforcement surface.
		 */
		capabilities?: string[];
		/** Effective organization role name, for role-list style checks. */
		rbacRole?: string | null;
		activeTab?: { value: 'structure' | 'vision' | 'media' };
		handleTabChange: (value: string) => void;
		userPreferences?: UserSessionPreferences | null;
	}

	let {
		schemas,
		documentTypes: documentTypesFromServer,
		schemaError = null,
		title = 'Aphex CMS',
		graphqlSettings = null,
		isReadOnly = false,
		capabilities = [],
		rbacRole = null,
		activeTab = { value: 'structure' } as { value: 'structure' | 'vision' | 'media' },
		handleTabChange = () => {},
		userPreferences = null
	}: Props = $props();

	// Publish capabilities to every descendant (DocumentEditor, fields, etc)
	// via Svelte context. Using a getter closure so prop reactivity propagates:
	// if the parent swaps the capabilities array (e.g. role change mid-session)
	// every `perms.can()` call in the subtree picks it up on next read.
	const perms = setPermissionsContext(
		() => capabilities,
		() => rbacRole
	);

	// Keep a state of the organization id
	let currentOrgId = $state<string | null>(page.url.searchParams.get('orgId'));

	// Merge document types with schema icons (schemas have icons, server data doesn't),
	// then filter out any schemas the caller can't read. Mirrors the server check:
	// an `access.read` list on a schema is an allowlist of role names (built-in
	// or custom); absence of a list means "whoever can read documents at all".
	const documentTypes = $derived(
		documentTypesFromServer
			.map((docType) => {
				const schema = schemas.find((s) => s.name === docType.name);
				return {
					...docType,
					icon: schema?.icon,
					group: schema?.group,
					access: schema?.access,
					singleton: schema?.singleton ?? false
				};
			})
			.filter((docType) => {
				const readList = docType.access?.read;
				if (!readList) return true; // no list = open to any reader
				// Functions (policy-based access) can't be evaluated on the client
				// without a target doc — show them and let the server enforce.
				if (typeof readList === 'function') return true;
				const role = perms.role;
				return role !== null && readList.includes(role);
			})
	);

	const hasDocumentTypes = $derived(documentTypes.length > 0);

	// Bucket document types by their `group` property. Ungrouped types sit in a
	// leading null bucket; named groups follow in first-seen order.
	const groupedDocumentTypes = $derived.by(() => {
		const buckets = new Map<string | null, typeof documentTypes>();
		buckets.set(null, []);
		for (const dt of documentTypes) {
			const key = dt.group ?? null;
			if (!buckets.has(key)) buckets.set(key, []);
			buckets.get(key)!.push(dt);
		}
		return Array.from(buckets.entries())
			.filter(([, items]) => items.length > 0)
			.map(([name, items]) => ({ name, items }));
	});

	// Client-side routing state
	let currentView = $state<'dashboard' | 'documents' | 'editor'>('dashboard');
	let selectedDocumentType = $state<string | null>(null);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let documentsList = $state<any[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Pagination state
	let docCurrentPage = $state(1);
	let docTotalPages = $state(1);
	let docTotalDocs = $state(0);
	let docPageSize = $state(20);
	const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

	// Organizations lookup map for displaying org names
	let organizationsMap = $state<Map<string, Organization>>(new Map());

	// Mobile navigation state (Sanity-style)
	let mobileView = $state<'types' | 'documents' | 'editor'>('types');

	// Window size reactivity
	let windowWidth = $state(1024); // Default to desktop size

	// Document editor state (moved before layoutConfig)
	let editingDocumentId = $state<string | null>(null);
	let isCreatingDocument = $state(false);

	// Focus mode — when on, the editor takes the full admin panel.
	// Side panels (types sidebar + documents list) collapse to hidden, the
	// existing mobile breadcrumb is reused as a navigation strip, and the
	// URL gets `?focus=1` so refresh keeps you in focus mode. Esc exits.
	let focusModeOn = $state(false);

	function toggleFocusMode() {
		focusModeOn = !focusModeOn;
		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (focusModeOn) {
			params.set('focus', '1');
		} else {
			params.delete('focus');
		}
		goto(`/admin?${params.toString()}`, { replaceState: true });
	}

	function exitFocusMode() {
		if (!focusModeOn) return;
		focusModeOn = false;
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.delete('focus');
		goto(`/admin?${params.toString()}`, { replaceState: true });
	}

	// Sync focus state from URL — covers refresh, deep links, back button.
	$effect(() => {
		const urlFocus = page.url.searchParams.get('focus') === '1';
		if (urlFocus !== focusModeOn) {
			focusModeOn = urlFocus;
		}
	});

	// Esc to exit focus mode.
	$effect(() => {
		if (typeof window === 'undefined') return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && focusModeOn) {
				exitFocusMode();
			}
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	});

	// Version history panel state
	let showVersionPanel = $state(false);
	let versionPanelDocId = $state<string | null>(null);
	let versionPreviewData = $state<{
		versionNumber: number;
		data: Record<string, any>;
		eventType: string;
	} | null>(null);

	// Documents list sorting state
	let sortDropdownOpen = $state(false);
	let currentSortName = $state<string>('updatedAtDesc'); // Default to "Last Edited"

	// Derive available orderings from current schema
	const availableOrderings = $derived.by(() => {
		if (!selectedDocumentType) return [];
		const schema = schemas.find((s) => s.name === selectedDocumentType);
		if (!schema) return [];
		return getOrderingsForSchema(schema);
	});

	// Get current ordering object (or derive it from currentSortName)
	const currentOrdering = $derived.by(() => {
		// First try to find it in availableOrderings
		let ordering = availableOrderings.find((o) => o.name === currentSortName);

		// If not found (e.g., it's an Asc version we created dynamically), derive it
		if (!ordering && currentSortName) {
			const isAsc = currentSortName.endsWith('Asc');
			const baseName = currentSortName.replace('Desc', '').replace('Asc', '');
			const descVersion = availableOrderings.find((o) => o.name === `${baseName}Desc`);

			if (descVersion && isAsc) {
				// Create asc version dynamically
				ordering = {
					...descVersion,
					name: currentSortName,
					by: descVersion.by.map((rule) => ({ ...rule, direction: 'asc' as const }))
				};
			}
		}

		return ordering || availableOrderings[0];
	});

	// Build sort string for API
	// Single field: 'title' (ascending) or '-publishedAt' (descending)
	// Multiple fields: ['title', '-publishedAt']
	const sortString = $derived.by(() => {
		if (!currentOrdering) return undefined;
		const sortFields = currentOrdering.by.map((rule) =>
			rule.direction === 'desc' ? `-${rule.field}` : rule.field
		);
		// Return array for multiple fields, string for single field
		return sortFields.length === 1 ? sortFields[0] : sortFields;
	});

	// Editor stack for nested references
	interface EditorStackItem {
		documentId: string;
		documentType: string;
		isCreating: boolean;
	}
	let editorStack = $state<EditorStackItem[]>([]);

	// Track which editor is currently active/focused (0 = primary, 1+ = stacked)
	let activeEditorIndex = $state<number>(0);

	// Layout: editors take precedence. When space is tight, panels collapse
	// to 60px strips. Types panel always stays visible; docs list collapses
	// first, then types.
	const MIN_EDITOR_WIDTH = 700;
	const COLLAPSED_WIDTH = 60;
	const TYPES_WIDTH = 350;
	const DOCS_WIDTH = 350;
	let layoutConfig = $derived.by(() => {
		const totalEditors = (currentView === 'editor' ? 1 : 0) + (editorStack.length > 0 ? 1 : 0);

		if (totalEditors === 0) {
			return {
				totalEditors: 0,
				expandedCount: 0,
				collapsedCount: 0,
				typesCollapsed: false,
				docsCollapsed: false,
				expandedIndices: [] as number[],
				activeIndex: activeEditorIndex,
				typesExpanded: true,
				docsExpanded: true
			};
		}

		const validActiveIndex =
			activeEditorIndex < 0
				? activeEditorIndex
				: Math.max(0, Math.min(activeEditorIndex, totalEditors - 1));

		const hasDocs = !!selectedDocumentType && !currentTypeIsSingleton;

		// Two editors open → always collapse both panels to maximize editing space
		let typesExpanded = totalEditors < 2;
		let docsExpanded = totalEditors < 2;

		let panelsWidth =
			(typesExpanded ? TYPES_WIDTH : COLLAPSED_WIDTH) +
			(hasDocs ? (docsExpanded ? DOCS_WIDTH : COLLAPSED_WIDTH) : 0);
		let editorSpace = windowWidth - panelsWidth;
		let maxEditors = Math.floor(editorSpace / MIN_EDITOR_WIDTH);

		// Single editor: collapse panels only if editor doesn't fit
		if (totalEditors === 1) {
			if (maxEditors < 1 && hasDocs) {
				docsExpanded = false;
				panelsWidth = TYPES_WIDTH + COLLAPSED_WIDTH;
				editorSpace = windowWidth - panelsWidth;
				maxEditors = Math.floor(editorSpace / MIN_EDITOR_WIDTH);
			}

			if (maxEditors < 1) {
				typesExpanded = false;
				panelsWidth = COLLAPSED_WIDTH + (hasDocs ? COLLAPSED_WIDTH : 0);
				editorSpace = windowWidth - panelsWidth;
				maxEditors = Math.floor(editorSpace / MIN_EDITOR_WIDTH);
			}
		}

		if (maxEditors < 1) maxEditors = 1;

		// Build expanded editor indices, prioritizing active + most recent
		let expandedIndices: number[] = [validActiveIndex];
		if (maxEditors > 1) {
			for (let i = totalEditors - 1; i >= 0 && expandedIndices.length < maxEditors; i--) {
				if (i !== validActiveIndex) expandedIndices.push(i);
			}
		}

		return {
			totalEditors,
			expandedCount: expandedIndices.length,
			collapsedCount: totalEditors - expandedIndices.length,
			typesCollapsed: !typesExpanded,
			docsCollapsed: !docsExpanded,
			expandedIndices,
			activeIndex: validActiveIndex,
			typesExpanded,
			docsExpanded
		};
	});

	let typesPanel = $derived.by(() => {
		// Focus mode hides the types sidebar entirely so the editor can take
		// the full admin panel.
		if (focusModeOn) return 'hidden';

		if (windowWidth < 620) {
			return mobileView === 'types' ? 'w-full' : 'hidden';
		}

		return layoutConfig.typesExpanded ? 'w-[350px]' : 'w-[60px]';
	});

	// True when the user is currently looking at a singleton-flagged doc type.
	// Drives layout adjustments — singletons skip the document-list panel
	// entirely and just show types-sidebar + editor.
	const currentTypeIsSingleton = $derived(
		!!selectedDocumentType &&
			(schemas.find((s) => s.name === selectedDocumentType)?.singleton ?? false)
	);

	let documentsPanelState = $derived.by(() => {
		if (focusModeOn) return { visible: false, width: 'none' };
		if (currentTypeIsSingleton) return { visible: false, width: 'none' };
		if (windowWidth < 620) {
			const state = { visible: mobileView === 'documents', width: 'full' };
			cmsLogger.debug('[Mobile Documents Panel]', { windowWidth, mobileView, state });
			return state;
		}
		if (!selectedDocumentType) return { visible: false, width: 'none' };

		const width = layoutConfig.docsExpanded ? 'normal' : 'compact';
		return { visible: true, width };
	});

	let primaryEditorState = $derived.by(() => {
		if (windowWidth < 620) {
			return { visible: mobileView === 'editor', expanded: true };
		}

		if (currentView !== 'editor') return { visible: false, expanded: false };

		// In focus mode, only the active editor shows — if active is a stacked
		// editor, the primary hides.
		if (focusModeOn && activeEditorIndex !== 0) {
			return { visible: true, expanded: false };
		}

		const primaryIndex = 0;
		const isExpanded = layoutConfig.expandedIndices.includes(primaryIndex);

		return { visible: true, expanded: isExpanded };
	});

	// Update window width on resize
	$effect(() => {
		if (typeof window !== 'undefined') {
			windowWidth = window.innerWidth;
			const handleResize = () => {
				windowWidth = window.innerWidth;
			};
			window.addEventListener('resize', handleResize);
			return () => window.removeEventListener('resize', handleResize);
		}
	});

	// Fetch organizations for lookup (when viewing multi-org documents)
	$effect(() => {
		// Re-fetch when includeChildOrganizations changes
		// const _includeChildren = userPreferences?.includeChildOrganizations;

		async function fetchOrganizations() {
			try {
				const result = await organizations.list();
				if (result.success && result.data) {
					const map = new Map<string, Organization>();
					result.data.forEach((org) => {
						map.set(org.id, org);
					});
					organizationsMap = map;
				}
			} catch {
				toast.error('Failed to fetch organizations');
			}
		}

		fetchOrganizations();
	});

	// Watch URL params for bookmarkable navigation
	$effect(() => {
		const url = page.url;
		const docType = url.searchParams.get('docType');
		const action = url.searchParams.get('action');
		const docId = url.searchParams.get('docId');
		const stackParam = url.searchParams.get('stack');
		const historyParam = url.searchParams.get('history');

		cmsLogger.debug('[URL Effect]', 'Params:', {
			docType,
			action,
			docId,
			stackParam,
			fullURL: url.toString()
		});

		if (action === 'create' && docType) {
			cmsLogger.debug('[URL Effect]', 'Branch: CREATE');
			currentView = 'editor';
			mobileView = 'editor';
			isCreatingDocument = true;
			editingDocumentId = null;
			editorStack = [];
			if (selectedDocumentType !== docType) {
				docCurrentPage = 1;
				selectedDocumentType = docType;
				fetchDocuments(docType);
			}
			// Note: no fallback refetch when docsList is empty — empty is a valid
			// steady state (type has no records). fetchDocuments reassigns the
			// list (new identity), which retriggers this effect; any "refetch if
			// empty" guard loops forever. If you need a manual refresh, use a
			// button, not an effect.
		} else if (docId) {
			cmsLogger.debug('[URL Effect]', 'Branch: EDIT (docId)');
			currentView = 'editor';
			mobileView = 'editor';
			editingDocumentId = docId;
			isCreatingDocument = false;

			// Parse stack param to restore stacked editors
			if (stackParam) {
				const stackItems = stackParam.split(',').map((item) => {
					const [type, id] = item.split(':');
					return { documentType: type, documentId: id, isCreating: false };
				}) as EditorStackItem[];

				// Only update stack and activeEditorIndex if the stack actually changed
				const stackChanged =
					editorStack.length !== stackItems.length ||
					editorStack.some(
						(item, i) =>
							item.documentId !== stackItems[i]?.documentId ||
							item.documentType !== stackItems[i]?.documentType
					);

				if (stackChanged) {
					cmsLogger.debug(
						'[AdminApp]',
						'Stack changed, updating editorStack and activeEditorIndex'
					);
					editorStack = stackItems;
					// Set active editor to the last stacked editor
					activeEditorIndex = stackItems.length; // 0 = primary, so stackItems.length is the last stacked editor
				}
			} else {
				// Only reset if there was a stack before
				if (editorStack.length > 0) {
					editorStack = [];
					activeEditorIndex = 0; // Primary editor is active
				}
			}

			// Restore version history panel from URL
			if (historyParam === '1' && !showVersionPanel) {
				showVersionPanel = true;
				versionPanelDocId = stackParam
					? (editorStack[editorStack.length - 1]?.documentId ?? docId)
					: docId;
			} else if (!historyParam && showVersionPanel) {
				showVersionPanel = false;
				versionPanelDocId = null;
				versionPreviewData = null;
			}

			if (docType) {
				if (selectedDocumentType !== docType) {
					selectedDocumentType = docType;
					fetchDocuments(docType);
				}
			} else {
				fetchDocumentForEditing(docId);
			}
		} else if (docType) {
			cmsLogger.debug('[URL Effect]', 'Branch: DOCUMENTS (docType only)');
			// Singletons never render the list — bounce straight to the editor.
			// Covers direct URLs, refresh, back-button — anything that lands on
			// `?docType=<singleton>` without a docId.
			const docTypeSchema = schemas.find((s) => s.name === docType);
			if (docTypeSchema?.singleton) {
				navigateToDocumentType(docType);
				return;
			}
			currentView = 'documents';
			mobileView = 'documents';
			editingDocumentId = null;
			isCreatingDocument = false;
			editorStack = [];
			// Only fetch if docType changed (org changes are handled by separate effect)
			if (selectedDocumentType !== docType) {
				docCurrentPage = 1;
				selectedDocumentType = docType;
				fetchDocuments(docType);
			} else {
				selectedDocumentType = docType;
			}
		} else {
			currentView = 'dashboard';
			mobileView = 'types';
			selectedDocumentType = null;
			editingDocumentId = null;
			isCreatingDocument = false;
			editorStack = [];
		}
	});

	// Watch orgId changes to refetch documents when switching organizations
	$effect(() => {
		const orgId = page.url.searchParams.get('orgId');

		// When orgId changes and we have a selected document type, refetch documents
		if (orgId && orgId !== currentOrgId && selectedDocumentType) {
			docCurrentPage = 1;
			fetchDocuments(selectedDocumentType);
			currentOrgId = orgId;
		}
	});

	async function navigateToDocumentType(docType: string) {
		if (activeTab.value !== 'structure') {
			handleTabChange('structure');
		}

		// Singletons skip the list view: list-by-type lazy-creates and returns
		// the canonical row, so we just open the editor on the resolved id.
		const schema = schemas.find((s) => s.name === docType);
		if (schema?.singleton) {
			const response = await documents.list({ type: docType });
			if (response.success && response.data?.[0]?.id) {
				await navigateToEditDocument(response.data[0].id, docType, false);
				return;
			}
			// Fall through to the list view if resolution fails so the user
			// at least sees an error surface rather than a stuck sidebar click.
		}

		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('docType', docType);
		params.delete('docId');
		params.delete('action');
		params.delete('stack');
		params.delete('history');
		await goto(`/admin?${params.toString()}`, { replaceState: false });
		mobileView = 'documents';
	}

	async function navigateToCreateDocument(docType: string) {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('docType', docType);
		params.set('action', 'create');
		params.delete('docId');
		params.delete('stack');
		params.delete('history');
		await goto(`/admin?${params.toString()}`, { replaceState: false });
		mobileView = 'editor';
	}

	async function navigateToEditDocument(docId: string, docType?: string, replace: boolean = false) {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('docId', docId);
		if (docType) params.set('docType', docType);
		params.delete('action');
		params.delete('fromDocId');
		params.delete('fromDocType');
		await goto(`/admin?${params.toString()}`, { replaceState: replace });
		mobileView = 'editor';
	}

	async function navigateBack() {
		// Going back always exits focus mode — otherwise the user lands on
		// the doc-list view with side panels still hidden, which feels stuck.
		if (focusModeOn) {
			focusModeOn = false;
		}

		// Check if we came from another document (mobile reference navigation)
		const fromDocId = page.url.searchParams.get('fromDocId');
		const fromDocType = page.url.searchParams.get('fromDocType');

		if (fromDocId && fromDocType) {
			// Navigate back to the document we came from
			await navigateToEditDocument(fromDocId, fromDocType, false);
		} else if (selectedDocumentType && !currentTypeIsSingleton) {
			// Navigate back to document list
			const params = new SvelteURLSearchParams(page.url.searchParams);
			params.set('docType', selectedDocumentType);
			params.delete('docId');
			params.delete('action');
			params.delete('stack');
			params.delete('focus');
			params.delete('history');
			await goto(`/admin?${params.toString()}`, { replaceState: false });
			mobileView = 'documents';
		} else {
			// Navigate back to home
			const params = new SvelteURLSearchParams(page.url.searchParams);
			params.delete('docType');
			params.delete('docId');
			params.delete('action');
			params.delete('stack');
			params.delete('focus');
			params.delete('history');
			await goto(`/admin?${params.toString()}`, { replaceState: false });
			mobileView = 'types';
		}
	}

	function handleOpenVersionHistory(docId: string) {
		showVersionPanel = true;
		versionPanelDocId = docId;
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('history', '1');
		goto(`/admin?${params.toString()}`, { replaceState: true });
	}

	function handleCloseVersionPanel() {
		showVersionPanel = false;
		versionPanelDocId = null;
		versionPreviewData = null;
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.delete('history');
		goto(`/admin?${params.toString()}`, { replaceState: true });
	}

	// Close version panel when navigating away
	let prevDocType = $state(selectedDocumentType);
	let prevDocId = $state(editingDocumentId);
	let initialNavDone = $state(false);
	$effect(() => {
		if (selectedDocumentType !== prevDocType || editingDocumentId !== prevDocId) {
			prevDocType = selectedDocumentType;
			prevDocId = editingDocumentId;
			if (initialNavDone && showVersionPanel) {
				showVersionPanel = false;
				versionPanelDocId = null;
				versionPreviewData = null;
			}
			initialNavDone = true;
		}
	});

	async function handleOpenReference(documentId: string, documentType: string) {
		// On mobile, navigate to the referenced document directly
		// Add fromDocId to track where we came from for proper back navigation
		if (windowWidth < 620) {
			const params = new SvelteURLSearchParams({
				docId: documentId,
				docType: documentType
			});
			// Track the document we're coming from
			if (editingDocumentId) {
				params.set('fromDocId', editingDocumentId);
				if (selectedDocumentType) {
					params.set('fromDocType', selectedDocumentType);
				}
			}
			await goto(`/admin?${params.toString()}`, { replaceState: false });
			mobileView = 'editor';
			return;
		}

		// On desktop — push onto the reference history stack. The UI only ever
		// shows one stacked panel (the last entry). The back button pops the
		// stack instead of closing, so you can walk back through the chain.
		if (editingDocumentId === documentId) {
			activeEditorIndex = 0;
			return;
		}

		const newEntry = { documentId, documentType, isCreating: false };

		// If clicking a ref from the primary editor (activeEditorIndex === 0)
		// and a stack already exists, the user is picking a different ref from
		// the same array — replace the whole stack with the new pick.
		// If clicking from within the stacked panel, push deeper.
		const newStack =
			activeEditorIndex === 0 && editorStack.length > 0 ? [newEntry] : [...editorStack, newEntry];

		// URL tracks the full chain for refresh support
		const stackParam = newStack.map((item) => `${item.documentType}:${item.documentId}`).join(',');
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('stack', stackParam);
		await goto(`/admin?${params.toString()}`, { replaceState: false });

		// The stacked panel is always index 1 (only one panel rendered)
		activeEditorIndex = 1;
	}

	// Back button on the stacked panel — pop one level. If the stack
	// becomes empty, the panel closes entirely.
	async function handleStackedEditorBack() {
		const newStack = editorStack.slice(0, -1);

		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (newStack.length > 0) {
			const stackParam = newStack
				.map((item) => `${item.documentType}:${item.documentId}`)
				.join(',');
			params.set('stack', stackParam);
		} else {
			params.delete('stack');
		}
		await goto(`/admin?${params.toString()}`, { replaceState: false });

		activeEditorIndex = newStack.length > 0 ? 1 : 0;
	}

	// Hard close — removes the stacked panel entirely (used by delete action)
	async function handleCloseStackedEditor(_index: number) {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.delete('stack');
		params.delete('history');
		await goto(`/admin?${params.toString()}`, { replaceState: false });
		activeEditorIndex = 0;
	}

	// Set active editor when clicking on a strip
	function setActiveEditor(index: number) {
		cmsLogger.debug('[AdminApp]', 'setActiveEditor called:', {
			previousIndex: activeEditorIndex,
			newIndex: index,
			editorStackLength: editorStack.length
		});
		activeEditorIndex = index;
	}

	let versionPanelRef = $state<{ refresh: () => void } | null>(null);

	function handleAutoSave(documentId: string, title: string) {
		if (documentsList.length > 0) {
			documentsList = documentsList.map((doc) =>
				doc.id === documentId ? { ...doc, title: title } : doc
			);
		}
		if (showVersionPanel && versionPanelDocId === documentId) {
			versionPanelRef?.refresh();
		}
	}

	function handleDocumentPublished(documentId: string) {
		if (showVersionPanel && versionPanelDocId === documentId) {
			versionPanelRef?.refresh();
		}
	}

	async function fetchDocumentForEditing(docId: string) {
		loading = true;
		error = null;

		try {
			const result = await documents.getById(docId);

			if (result.success && result.data) {
				const documentType = result.data.type;

				if (documentsList.length === 0 || selectedDocumentType !== documentType) {
					await fetchDocuments(documentType);
				}

				selectedDocumentType = documentType;
			} else {
				throw new Error(result.error || 'Failed to fetch document');
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to load document');
			error = err instanceof Error ? err.message : 'Failed to load document';
			await goto('/admin', { replaceState: true });
		} finally {
			loading = false;
		}
	}

	async function fetchDocuments(docType: string) {
		cmsLogger.debug('[AdminApp]', 'FETCHING DOCUMENTS', { sort: sortString });
		loading = true;
		error = null;

		try {
			const result = await documents.list({
				docType,
				page: docCurrentPage,
				pageSize: docPageSize,
				includeChildOrganizations: userPreferences?.includeChildOrganizations ?? false,
				sort: sortString
			});

			if (result.success && result.data) {
				// Update pagination state from response
				if (result.pagination) {
					docTotalPages = result.pagination.totalPages;
					docTotalDocs = result.pagination.total;
				} else {
					docTotalPages = 1;
					docTotalDocs = result.data.length;
				}
				// Find schema for preview config
				const schema = schemas.find((s) => s.name === docType);

				documentsList = result.data.map((doc: any) => {
					// With LocalAPI, data is already flattened at top level (not in draftData)
					// The document itself IS the data, with _meta containing metadata

					const title = resolvePreviewTitle(doc, schema);
					const subtitle = resolvePreviewSubtitle(doc, schema) ?? undefined;

					// Metadata is in _meta field (from LocalAPI transformation)
					const meta = doc._meta || {};

					return {
						id: doc.id,
						title,
						subtitle,
						status: meta.status || 'draft',
						publishedAt: meta.publishedAt ? new Date(meta.publishedAt) : null,
						updatedAt: meta.updatedAt ? new Date(meta.updatedAt) : null,
						createdAt: meta.createdAt ? new Date(meta.createdAt) : null,
						// hasChanges is tracked via publishedHash comparison
						// If publishedHash is null, it's never been published or has unpublished changes
						hasChanges: meta.status === 'published' && meta.publishedHash === null,
						// Include organization info for multi-org view
						organizationId: meta.organizationId || null
					};
				});
			} else {
				throw new Error(result.error || 'Failed to fetch documents');
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to load documents');
			error = err instanceof Error ? err.message : 'Failed to load documents';
			documentsList = [];
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title
		>{activeTab.value === 'structure'
			? 'Content'
			: activeTab.value === 'media'
				? 'Media'
				: 'Vision'} - {title}</title
	>
</svelte:head>

<div class="flex h-full flex-col overflow-hidden">
	<!-- Breadcrumb navigation: mobile (< 620px) or focus mode on any width -->
	{#if (windowWidth < 620 || focusModeOn) && activeTab.value === 'structure'}
		<div class="border-border bg-background border-b">
			<div class="flex h-12 items-center px-4">
				{#if mobileView === 'documents' && selectedDocumentType}
					<button
						onclick={async () => {
							mobileView = 'types';
							const params = new SvelteURLSearchParams(page.url.searchParams);
							params.delete('docType');
							params.delete('docId');
							params.delete('action');
							params.delete('stack');
							params.delete('history');
							await goto(`/admin?${params.toString()}`, { replaceState: false });
						}}
						class="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 19l-7-7 7-7"
							/>
						</svg>
						Content
					</button>
					<span class="text-muted-foreground mx-2">/</span>
					<span class="text-sm font-medium">
						{pluralize(
							documentTypes.find((t) => t.name === selectedDocumentType)?.title ||
								selectedDocumentType
						)}
					</span>
				{:else if mobileView === 'editor'}
					<Button
						onclick={navigateBack}
						variant="ghost"
						class="text-muted-foreground hover:text-foreground text-sm"
					>
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 19l-7-7 7-7"
							/>
						</svg>
					</Button>
					<span class="ml-3 text-sm font-medium">
						{selectedDocumentType
							? documentTypes.find((t) => t.name === selectedDocumentType)?.title ||
								selectedDocumentType
							: 'Document'}
					</span>
				{:else}
					<span class="text-sm font-medium">Content</span>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Main Content -->
	<div class="flex-1 overflow-hidden">
		<Tabs.Root value={activeTab.value} onValueChange={handleTabChange} class="h-full">
			<Tabs.Content value="structure" class="h-full overflow-hidden">
				{#key `${currentView}-${selectedDocumentType}`}
					<div class={windowWidth < 620 ? 'h-full w-full' : 'flex h-full w-full overflow-hidden'}>
						{#if schemaError}
							<div class="bg-destructive/5 flex flex-1 items-center justify-center p-8">
								<div class="w-full max-w-2xl">
									<Alert variant="destructive">
										<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.704-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
											/>
										</svg>
										<AlertTitle>Schema Validation Error</AlertTitle>
										<AlertDescription class="whitespace-pre-line">
											{schemaError.message}
										</AlertDescription>
									</Alert>
								</div>
							</div>
						{:else}
							<!-- Types Panel -->
							<div
								class="border-rule border-r transition-all duration-200 {windowWidth < 620
									? typesPanel === 'hidden'
										? 'hidden'
										: 'h-full w-screen'
									: typesPanel} {typesPanel === 'hidden'
									? 'hidden'
									: 'block'} h-full overflow-hidden"
							>
								{#if typesPanel === 'w-[60px]'}
									<button
										onclick={() => setActiveEditor(-1)}
										class="hover:bg-muted/30 flex h-full w-full cursor-pointer flex-col transition-colors"
										title="Click to expand content types"
									>
										<div class="flex flex-1 items-start justify-center p-2 pt-8 text-left">
											<div
												class="text-foreground -mt-2 text-sm font-medium whitespace-nowrap [writing-mode:vertical-rl]"
											>
												Content
											</div>
										</div>
									</button>
								{:else}
									<div class="h-full overflow-y-auto p-3">
										{#if hasDocumentTypes}
											<h2
												class="text-muted-foreground border-rule mt-2 mb-3 hidden px-2 pb-3 text-sm font-medium sm:block sm:border-b"
											>
												Content
											</h2>
											{#each groupedDocumentTypes as bucket (bucket.name ?? '__ungrouped__')}
												{#if bucket.name}
													<div
														class="text-muted-foreground mt-3 mb-1 px-2 text-xs font-semibold tracking-wide uppercase first:mt-0"
													>
														{bucket.name}
													</div>
												{/if}
												{#each bucket.items as docType (docType.name)}
													<button
														onclick={() => navigateToDocumentType(docType.name)}
														class="hover:bg-muted/50 group flex w-full cursor-pointer items-center justify-between rounded-md px-2 py-2.5 text-left transition-colors {selectedDocumentType ===
														docType.name
															? 'bg-muted/50'
															: ''}"
														title={docType.description || ''}
													>
														<div class="flex items-center gap-2">
															<div
																class="text-muted-foreground flex h-5 w-5 items-center justify-center"
															>
																{#if docType.icon}
																	{@const Icon = docType.icon}
																	<Icon class="h-4 w-4" />
																{:else}
																	<FileText class="h-4 w-4" />
																{/if}
															</div>
															<span class="text-sm"
																>{docType.singleton
																	? docType.title
																	: pluralize(docType.title)}</span
															>
														</div>
														<svg
															class="text-muted-foreground h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
															fill="none"
															viewBox="0 0 24 24"
															stroke="currentColor"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M9 5l7 7-7 7"
															/>
														</svg>
													</button>
												{/each}
											{/each}
										{:else}
											<div class="p-6 text-center">
												<div
													class="bg-muted/50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
												>
													<FileText class="text-muted-foreground h-8 w-8" />
												</div>
												<h3 class="mb-2 font-medium">No content types found</h3>
												<p class="text-muted-foreground mb-4 text-sm">
													Get started by defining your first schema type
												</p>
												<p class="text-muted-foreground text-xs">
													Add schemas in <code class="bg-muted rounded px-1.5 py-0.5 text-xs"
														>src/lib/schemaTypes/</code
													>
												</p>
											</div>
										{/if}
									</div>
								{/if}
							</div>

							<!-- Documents Panel -->
							{#if selectedDocumentType}
								<div
									class="border-rule flex h-full flex-col overflow-hidden border-r transition-all duration-200
		              {!documentsPanelState.visible ? 'hidden' : ''}
		              {windowWidth < 620 ? (documentsPanelState.visible ? 'w-screen' : 'hidden') : ''}
		              {windowWidth >= 620 && documentsPanelState.width === 'full' ? 'w-full' : ''}
		              {windowWidth >= 620 && documentsPanelState.width === 'normal' ? 'w-[350px]' : ''}
		              {windowWidth >= 620 && documentsPanelState.width === 'compact' ? 'w-[60px]' : ''}
		              {windowWidth >= 620 && documentsPanelState.width === 'flex' ? 'flex-1' : ''}
		            "
								>
									{#if documentsPanelState.width === 'compact'}
										<button
											onclick={() => setActiveEditor(-2)}
											class="hover:bg-muted/30 flex h-full w-full cursor-pointer flex-col transition-colors"
											title="Click to expand documents list"
										>
											<div class="flex flex-1 items-start justify-center p-2 pt-8 text-left">
												<div
													class="text-foreground -mt-2 text-sm font-medium whitespace-nowrap [writing-mode:vertical-rl]"
												>
													{pluralize(
														documentTypes.find((t) => t.name === selectedDocumentType)?.title ||
															selectedDocumentType
													)}
												</div>
											</div>
										</button>
									{:else}
										{@const currentDocType = documentTypes.find(
											(t) => t.name === selectedDocumentType
										)}
										<div class="border-border bg-muted/30 border-b p-3">
											<div class="flex items-center justify-between">
												<div class="flex items-center gap-3">
													{#if windowWidth > 620}
														<!-- Desktop: Icon -->
														<div class="flex h-6 w-6 items-center justify-center">
															{#if currentDocType?.icon}
																{@const Icon = currentDocType.icon}
																<Icon class="text-muted-foreground h-4 w-4" />
															{:else}
																<FileText class="text-muted-foreground h-4 w-4" />
															{/if}
														</div>
													{/if}
													<div>
														<h3 class="text-sm font-medium">
															{pluralize(currentDocType?.title || selectedDocumentType)}
														</h3>
														<p class="text-muted-foreground text-xs">
															{docTotalDocs} document{docTotalDocs !== 1 ? 's' : ''}
														</p>
													</div>
												</div>
												<div class="flex items-center gap-1">
													{#if perms.can('document.create') && !schemas.find((s) => s.name === selectedDocumentType)?.singleton}
														<Button
															size="sm"
															variant="ghost"
															onclick={() => navigateToCreateDocument(selectedDocumentType!)}
															class="h-8 w-8 p-0"
															title="Create new document"
														>
															<svg
																class="h-4 w-4"
																fill="none"
																viewBox="0 0 24 24"
																stroke="currentColor"
															>
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	stroke-width="2"
																	d="M12 4v16m8-8H4"
																/>
															</svg>
														</Button>
													{/if}

													<!-- Sorting Menu Popover -->
													<Popover.Root bind:open={sortDropdownOpen}>
														<Popover.Trigger>
															{#snippet child({ props })}
																<Button
																	{...props}
																	size="sm"
																	variant="ghost"
																	class="h-8 w-8 cursor-pointer p-0"
																	title="Sort documents"
																>
																	<Ellipsis class="h-4 w-4" />
																</Button>
															{/snippet}
														</Popover.Trigger>
														<Popover.Content class="w-60 p-2">
															<div class="text-muted-foreground mb-2 px-2 text-xs font-semibold">
																Sort by
															</div>
															<div class="flex flex-col gap-0.5">
																{#each availableOrderings as ordering (ordering.name)}
																	{@const fieldName = ordering.by[0]?.field}
																	{@const baseName = ordering.name
																		.replace('Desc', '')
																		.replace('Asc', '')}
																	{@const isActive =
																		currentSortName === ordering.name ||
																		currentSortName === `${baseName}Asc`}
																	{@const direction =
																		isActive && currentSortName.endsWith('Asc')
																			? 'asc'
																			: ordering.by[0]?.direction}
																	{@const currentSchema = schemas.find(
																		(s) => s.name === selectedDocumentType
																	)}
																	{@const schemaField = currentSchema?.fields.find(
																		(f) => f.name === fieldName
																	)}
																	{@const fieldType =
																		schemaField?.type ||
																		(fieldName === 'updatedAt' || fieldName === 'createdAt'
																			? 'datetime'
																			: 'string')}
																	<button
																		onclick={async () => {
																			// Toggle between desc ↔ asc for active field, or select new field (desc)
																			if (isActive) {
																				// Toggle direction: desc → asc or asc → desc
																				const newDirection = direction === 'desc' ? 'asc' : 'desc';
																				// const fieldName = ordering.by[0]?.field;
																				const baseName = ordering.name
																					.replace('Desc', '')
																					.replace('Asc', '');
																				currentSortName = `${baseName}${newDirection === 'asc' ? 'Asc' : 'Desc'}`;
																			} else {
																				// Select this ordering (defaults to desc)
																				currentSortName = ordering.name;
																			}

																			if (selectedDocumentType) {
																				docCurrentPage = 1;
																				await fetchDocuments(selectedDocumentType);
																			}
																		}}
																		class="hover:bg-muted flex items-center justify-between rounded px-2 py-2 text-left text-sm transition-colors {isActive
																			? 'bg-muted'
																			: ''}"
																	>
																		<span class={isActive ? 'font-medium' : ''}>
																			{ordering.title
																				.replace(' (A-Z)', '')
																				.replace(' (Z-A)', '')
																				.replace(' (Newest)', '')
																				.replace(' (Oldest)', '')
																				.replace(' (High to Low)', '')
																				.replace(' (Low to High)', '')}
																		</span>
																		{#if isActive}
																			<span class="text-muted-foreground">
																				{#if fieldType === 'string'}
																					{#if direction === 'asc'}
																						<ArrowDownAZ class="h-4 w-4" />
																					{:else}
																						<ArrowUpZA class="h-4 w-4" />
																					{/if}
																				{:else if fieldType === 'number' || fieldType === 'date' || fieldType === 'datetime'}
																					{#if direction === 'asc'}
																						<ArrowDown01 class="h-4 w-4" />
																					{:else}
																						<ArrowUp10 class="h-4 w-4" />
																					{/if}
																				{:else if direction === 'asc'}
																					<ArrowDownUp class="h-4 w-4" />
																				{:else}
																					<ArrowDownUp class="h-4 w-4" />
																				{/if}
																			</span>
																		{/if}
																	</button>
																{/each}
															</div>
														</Popover.Content>
													</Popover.Root>
												</div>
											</div>
										</div>

										<div class="flex-1 overflow-y-auto">
											{#if error}
												<div class="p-4">
													<Alert variant="destructive">
														<AlertDescription>{error}</AlertDescription>
													</Alert>
												</div>
											{:else if loading}
												<DocumentsSkeleton />
											{:else if documentsList.length > 0}
												{#each documentsList as doc, index (index)}
													{@const isActive = editingDocumentId === doc.id}
													<button
														onclick={() => navigateToEditDocument(doc.id, selectedDocumentType!)}
														class="hover:bg-muted/50 border-border group flex w-full cursor-pointer items-center justify-between border-b p-3 text-left transition-colors {isActive
															? 'bg-muted/50'
															: ''}"
													>
														<div class="flex min-w-0 flex-1 items-center gap-3">
															<div class="flex h-6 w-6 items-center justify-center">
																{#if currentDocType?.icon}
																	{@const Icon = currentDocType.icon}
																	<Icon class="text-muted-foreground h-4 w-4" />
																{:else}
																	<FileText class="text-muted-foreground h-4 w-4" />
																{/if}
															</div>
															<div class="min-w-0 flex-1">
																{#if userPreferences?.includeChildOrganizations && doc.organizationId && organizationsMap.has(doc.organizationId)}
																	<p class="text-muted-foreground/70 truncate text-xs italic">
																		{organizationsMap.get(doc.organizationId)?.name}
																	</p>
																{/if}
																<h3 class="truncate text-sm font-medium">{doc.title}</h3>
																{#if doc.subtitle}
																	<p class="text-muted-foreground truncate text-xs">
																		{doc.subtitle}
																	</p>
																{:else if doc.slug}
																	<p class="text-muted-foreground text-xs">/{doc.slug}</p>
																{/if}
															</div>
														</div>
														<div class="flex items-center gap-2">
															<span class="text-muted-foreground text-xs">
																{doc.updatedAt?.toLocaleDateString() || ''}
															</span>
															<div class="flex items-center gap-1">
																{#if doc.status === 'published'}
																	{#if doc.hasChanges}
																		<span
																			class="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
																			title="Unpublished changes"
																		></span>
																	{/if}
																	<span
																		class="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500"
																		title="Published"
																	></span>
																{:else if doc.status === 'unpublished'}
																	<span
																		class="bg-muted-foreground/60 h-1.5 w-1.5 shrink-0 rounded-full"
																		title="Unpublished"
																	></span>
																{:else}
																	<span
																		class="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500"
																		title="Draft"
																	></span>
																{/if}
															</div>
														</div>
													</button>
												{/each}
											{:else}
												<div class="p-6 text-center">
													<div
														class="bg-muted/50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
													>
														{#if currentDocType?.icon}
															{@const Icon = currentDocType.icon}
															<Icon class="text-muted-foreground h-8 w-8" />
														{:else}
															<FileText class="text-muted-foreground h-8 w-8" />
														{/if}
													</div>
													<h3 class="mb-2 font-medium">No documents found</h3>
													<p class="text-muted-foreground text-sm">
														Create your first {selectedDocumentType} document using the + button above
													</p>
												</div>
											{/if}
										</div>

										<!-- Pagination Controls -->
										{#if docTotalDocs > PAGE_SIZE_OPTIONS[0]}
											<div
												class="border-border flex items-center justify-between border-t px-3 py-2"
											>
												<div class="flex items-center gap-1">
													<Button
														size="sm"
														variant="ghost"
														class="h-7 w-7 p-0"
														disabled={docCurrentPage <= 1}
														onclick={async () => {
															docCurrentPage = Math.max(1, docCurrentPage - 1);
															if (selectedDocumentType) await fetchDocuments(selectedDocumentType);
														}}
													>
														<ChevronLeft class="h-4 w-4" />
													</Button>
													<span class="text-muted-foreground text-xs">
														{(docCurrentPage - 1) * docPageSize + 1}–{Math.min(
															docCurrentPage * docPageSize,
															docTotalDocs
														)} of {docTotalDocs}
													</span>
													<Button
														size="sm"
														variant="ghost"
														class="h-7 w-7 p-0"
														disabled={docCurrentPage >= docTotalPages}
														onclick={async () => {
															docCurrentPage = Math.min(docTotalPages, docCurrentPage + 1);
															if (selectedDocumentType) await fetchDocuments(selectedDocumentType);
														}}
													>
														<ChevronRight class="h-4 w-4" />
													</Button>
												</div>
												<Select.Root
													type="single"
													value={String(docPageSize)}
													onValueChange={async (value) => {
														if (value) {
															docPageSize = Number(value);
															docCurrentPage = 1;
															if (selectedDocumentType) await fetchDocuments(selectedDocumentType);
														}
													}}
												>
													<Select.Trigger size="sm" class="h-7 border-none text-xs shadow-none">
														{docPageSize} / page
													</Select.Trigger>
													<Select.Content>
														<Select.Group>
															{#each PAGE_SIZE_OPTIONS as size}
																<Select.Item value={String(size)} label="{size} / page">
																	{size} / page
																</Select.Item>
															{/each}
														</Select.Group>
													</Select.Content>
												</Select.Root>
											</div>
										{/if}
									{/if}
								</div>
							{/if}

							<!-- Primary Editor Panel -->
							{#if primaryEditorState.visible}
								<div
									class="transition-all duration-200 {windowWidth < 620
										? 'w-screen'
										: 'flex-1'} h-full overflow-x-hidden overflow-y-auto {primaryEditorState.expanded
										? ''
										: 'hidden'}"
									style={windowWidth >= 620 ? 'min-width: 0;' : ''}
								>
									<DocumentEditor
										{schemas}
										documentType={selectedDocumentType!}
										documentId={editingDocumentId}
										isCreating={isCreatingDocument}
										focusMode={focusModeOn}
										onToggleFocus={toggleFocusMode}
										onBack={navigateBack}
										onOpenReference={handleOpenReference}
										onOpenVersionHistory={handleOpenVersionHistory}
										externalVersionPreview={versionPanelDocId === editingDocumentId
											? versionPreviewData
											: null}
										onSaved={async (docId) => {
											if (selectedDocumentType) {
												await fetchDocuments(selectedDocumentType);
											}
											// For first-time creation, update URL and local state.
											// Use goto with replaceState:true so page.url stays in sync —
											// raw replaceState() from $app/navigation updates the URL bar
											// but leaves page.url.searchParams stale, which breaks any
											// subsequent navigation that reads from it (e.g. opening a
											// stacked reference editor) because the old ?action=create
											// gets carried forward.
											if (isCreatingDocument) {
												// Update local state FIRST so the URL Effect's EDIT branch
												// sees consistent values when goto fires it.
												isCreatingDocument = false;
												editingDocumentId = docId;

												const params = new SvelteURLSearchParams(page.url.searchParams);
												params.set('docId', docId);
												if (selectedDocumentType) params.set('docType', selectedDocumentType);
												params.delete('action');
												await goto(`/admin?${params.toString()}`, {
													replaceState: true,
													keepFocus: true,
													noScroll: true
												});
											} else {
												// For subsequent saves, use normal navigation
												navigateToEditDocument(docId, selectedDocumentType!);
											}
										}}
										onAutoSaved={handleAutoSave}
										onPublished={async (docId) => {
											handleDocumentPublished(docId);
											if (selectedDocumentType) {
												await fetchDocuments(selectedDocumentType);
											}
										}}
										onUnpublished={async (docId) => {
											handleDocumentPublished(docId);
											if (selectedDocumentType) {
												await fetchDocuments(selectedDocumentType);
											}
										}}
										onRestored={async (docId) => {
											handleDocumentPublished(docId);
											if (selectedDocumentType) {
												await fetchDocuments(selectedDocumentType);
											}
										}}
										onDeleted={async () => {
											if (selectedDocumentType) {
												await fetchDocuments(selectedDocumentType);
												const params = new SvelteURLSearchParams(page.url.searchParams);
												params.set('docType', selectedDocumentType);
												params.delete('docId');
												params.delete('action');
												await goto(`/admin?${params.toString()}`, { replaceState: false });
											} else {
												const orgId = page.url.searchParams.get('orgId');
												const url = orgId ? `/admin?orgId=${orgId}` : '/admin';
												await goto(url, { replaceState: false });
											}
										}}
										{isReadOnly}
									/>
								</div>
								{#if !primaryEditorState.expanded && !focusModeOn}
									<!-- Collapsed Primary Editor Strip -->
									<button
										onclick={() => setActiveEditor(0)}
										class="border-rule hover:bg-muted/50 flex h-full w-[60px] cursor-pointer flex-col border-l transition-colors"
										title="Click to expand {selectedDocumentType}"
									>
										<div class="flex flex-1 items-start justify-center p-2 pt-8 text-left">
											<div
												class="text-foreground -mt-2 text-sm font-medium whitespace-nowrap [writing-mode:vertical-rl]"
											>
												{selectedDocumentType
													? selectedDocumentType.charAt(0).toUpperCase() +
														selectedDocumentType.slice(1)
													: ''}
											</div>
										</div>
									</button>
								{/if}
							{/if}

							<!-- Stacked Reference Panel — only the last entry in the stack
							     is rendered. Back button pops the stack (walks back through
							     the ref chain); closing entirely on the last pop. -->
							{#if editorStack.length > 0}
								{@const currentRef = editorStack[editorStack.length - 1]!}
								{@const isExpanded = focusModeOn
									? activeEditorIndex === 1
									: layoutConfig.expandedIndices.includes(1)}

								{#if isExpanded}
									<div
										class="border-rule h-full flex-1 overflow-x-hidden overflow-y-auto border-l transition-all duration-200"
										style="min-width: 0;"
									>
										<DocumentEditor
											{schemas}
											documentType={currentRef.documentType}
											documentId={currentRef.documentId}
											isCreating={currentRef.isCreating}
											onBack={handleStackedEditorBack}
											onOpenReference={handleOpenReference}
											onOpenVersionHistory={handleOpenVersionHistory}
											onToggleFocus={() => {
												activeEditorIndex = 1;
												toggleFocusMode();
											}}
											externalVersionPreview={versionPanelDocId === currentRef.documentId
												? versionPreviewData
												: null}
											onSaved={async () => {}}
											onAutoSaved={handleAutoSave}
											onPublished={async (docId) => {
												handleDocumentPublished(docId);
												if (selectedDocumentType) {
													await fetchDocuments(selectedDocumentType);
												}
											}}
											onUnpublished={async (docId) => {
												handleDocumentPublished(docId);
												if (selectedDocumentType) {
													await fetchDocuments(selectedDocumentType);
												}
											}}
											onRestored={async (docId) => {
												handleDocumentPublished(docId);
												if (selectedDocumentType) {
													await fetchDocuments(selectedDocumentType);
												}
											}}
											onDeleted={async () => {
												handleCloseStackedEditor(0);
											}}
											{isReadOnly}
										/>
									</div>
								{:else if !focusModeOn}
									<!-- Collapsed Stacked Editor Strip -->
									<button
										onclick={() => setActiveEditor(1)}
										class="border-rule hover:bg-muted/50 flex h-full w-[60px] cursor-pointer flex-col border-l transition-colors"
										title="Click to expand {currentRef.documentType}"
									>
										<div class="flex h-full flex-1 items-start justify-center p-2 pt-8 text-left">
											<div
												class="text-foreground text-sm font-medium whitespace-nowrap [writing-mode:vertical-rl]"
											>
												{currentRef.documentType.charAt(0).toUpperCase() +
													currentRef.documentType.slice(1)}
											</div>
										</div>
									</button>
								{/if}
							{/if}
						{/if}

						<!-- Version History Panel -->
						{#if showVersionPanel && versionPanelDocId}
							<div
								class="border-rule h-full w-[280px] shrink-0 overflow-y-auto border-l transition-all duration-200"
							>
								<DocumentVersionPanel
									bind:this={versionPanelRef}
									documentId={versionPanelDocId}
									onClose={handleCloseVersionPanel}
									onPreviewVersion={(v) => {
										versionPreviewData = v;
									}}
									onRestored={async () => {
										versionPreviewData = null;
										if (selectedDocumentType) {
											await fetchDocuments(selectedDocumentType);
										}
									}}
								/>
							</div>
						{/if}
					</div>
				{/key}
			</Tabs.Content>

			{#if graphqlSettings?.enableGraphiQL}
				<Tabs.Content value="vision" class="m-0 h-full p-0">
					<div class="bg-muted/10 flex h-full items-center justify-center">
						<div class="space-y-4 text-center">
							<div
								class="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full"
							>
								<svg
									class="text-primary h-8 w-8"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
									/>
								</svg>
							</div>

							<div>
								<h3 class="mb-2 text-lg font-semibold">GraphQL Playground</h3>

								<p class="text-muted-foreground mb-4">Query your CMS data with the GraphQL API</p>

								<a
									href={graphqlSettings.endpoint}
									target="_blank"
									class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-md px-4 py-2 transition-colors"
								>
									Open Playground

									<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
										/>
									</svg>
								</a>
							</div>
						</div>
					</div>
				</Tabs.Content>
			{/if}

			<Tabs.Content value="media" class="m-0 h-full p-0">
				<MediaBrowser active={activeTab.value === 'media'} />
			</Tabs.Content>
		</Tabs.Root>
	</div>
</div>

<ConfirmDialogHost />
