<script lang="ts">
	/**
	 * AdminApp - Complete CMS Admin Interface
	 * A packaged, reusable Sanity-style admin UI
	 */
	import { Alert, AlertDescription, AlertTitle } from '@aphex/ui/shadcn/alert';
	import { Button } from '@aphex/ui/shadcn/button';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import { toggleMode } from 'mode-watcher';
	import * as Tabs from '@aphex/ui/shadcn/tabs';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import type { SchemaType } from '../types/index.js';
	import DocumentEditor from './admin/DocumentEditor.svelte';
	import type { DocumentType } from '../types/index.js';

	type InitDocumentType = Pick<DocumentType, 'name' | 'title' | 'description'>;

	interface Props {
		schemas: SchemaType[];
		documentTypes: InitDocumentType[];
		schemaError?: { message: string } | null;
		title?: string;
	}

	let { schemas, documentTypes, schemaError = null, title = 'Aphex CMS' }: Props = $props();

	// Set schema context for child components

	const hasDocumentTypes = $derived(documentTypes.length > 0);

	// Client-side routing state
	let currentView = $state<'dashboard' | 'documents' | 'editor'>('dashboard');
	let selectedDocumentType = $state<string | null>(null);

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let documentsList = $state<any[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Mobile navigation state (Sanity-style)
	let mobileView = $state<'types' | 'documents' | 'editor'>('types');

	// Top-level tab state (Structure / Vision)
	let activeTab = $state<'structure' | 'vision'>('structure');

	// Window size reactivity
	let windowWidth = $state(1024); // Default to desktop size

	// Document editor state (moved before layoutConfig)
	let editingDocumentId = $state<string | null>(null);
	let isCreatingDocument = $state(false);

	// Editor stack for nested references
	interface EditorStackItem {
		documentId: string;
		documentType: string;
		isCreating: boolean;
	}
	let editorStack = $state<EditorStackItem[]>([]);

	// Track which editor is currently active/focused (0 = primary, 1+ = stacked)
	let activeEditorIndex = $state<number>(0);

	// Calculate how many editors can be shown expanded based on available space
	const MIN_EDITOR_WIDTH = 600; // Minimum width for ANY expanded editor
	const COLLAPSED_WIDTH = 60; // Width of collapsed panels
	const COLLAPSED_EDITOR_WIDTH = 60; // Width of collapsed editors
	const TYPES_EXPANDED = 350;
	const DOCS_EXPANDED = 350;

	let layoutConfig = $derived.by(() => {
		const start = performance.now();
		const totalEditors = (currentView === 'editor' ? 1 : 0) + editorStack.length;

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

		// Ensure activeEditorIndex is valid (can be -1 for types, -2 for docs)
		const validActiveIndex =
			activeEditorIndex < 0
				? activeEditorIndex
				: Math.max(0, Math.min(activeEditorIndex, totalEditors - 1));

		// Check if types or docs are active (user clicked on collapsed strip)
		const typesActive = activeEditorIndex === -1;
		const docsActive = activeEditorIndex === -2;

		// Calculate space requirements
		// If user clicked types/docs, force those panels expanded
		// Otherwise, prioritize editors over panels

		let typesExpanded = typesActive || true; // Expand types if clicked, or by default
		let docsExpanded = docsActive || true; // Expand docs if clicked, or by default
		let typesWidth = typesExpanded ? TYPES_EXPANDED : COLLAPSED_WIDTH;
		let docsWidth = selectedDocumentType ? (docsExpanded ? DOCS_EXPANDED : COLLAPSED_WIDTH) : 0;

		// If user explicitly clicked types/docs, keep those panels expanded no matter what
		if (typesActive || docsActive) {
			// Force the clicked panel to stay expanded
			typesExpanded = typesActive ? true : typesExpanded;
			docsExpanded = docsActive ? true : docsExpanded;
			typesWidth = typesActive ? TYPES_EXPANDED : COLLAPSED_WIDTH;
			docsWidth = docsActive ? DOCS_EXPANDED : selectedDocumentType ? COLLAPSED_WIDTH : 0;

			// Calculate how many editors fit with these panel sizes
			let remainingWidth = windowWidth - typesWidth - docsWidth;
			let maxExpandedEditors = Math.floor(remainingWidth / MIN_EDITOR_WIDTH);

			// Expand as many editors as possible around the last active editor
			if (maxExpandedEditors < 1) maxExpandedEditors = 0;

			// Build expanded indices for editors
			let expandedIndices: number[] = [];
			if (maxExpandedEditors > 0 && totalEditors > 0) {
				// Start from rightmost editor (most recently opened)
				const lastEditorIndex = totalEditors - 1;
				expandedIndices.push(lastEditorIndex);

				// Expand editors to the left if space allows
				for (
					let i = lastEditorIndex - 1;
					i >= 0 && expandedIndices.length < maxExpandedEditors;
					i--
				) {
					expandedIndices.push(i);
				}
			}

			const expandedCount = expandedIndices.length;

			return {
				totalEditors,
				expandedCount,
				collapsedCount: totalEditors - expandedCount,
				typesCollapsed: !typesExpanded,
				docsCollapsed: !docsExpanded,
				expandedIndices,
				activeIndex: validActiveIndex,
				typesExpanded,
				docsExpanded
			};
		}

		// Normal mode: prioritize editors over panels
		// Calculate how many editors we can fit with current panel widths
		let remainingWidth = windowWidth - typesWidth - docsWidth;
		let maxExpandedEditors = Math.floor(remainingWidth / MIN_EDITOR_WIDTH);

		// If we can't fit all editors, start collapsing panels
		if (maxExpandedEditors < totalEditors) {
			// Try collapsing docs first
			docsWidth = selectedDocumentType ? COLLAPSED_WIDTH : 0;
			docsExpanded = false;
			remainingWidth = windowWidth - typesWidth - docsWidth;
			maxExpandedEditors = Math.floor(remainingWidth / MIN_EDITOR_WIDTH);
		}

		// If still not enough space, collapse types too
		if (maxExpandedEditors < totalEditors) {
			typesWidth = COLLAPSED_WIDTH;
			typesExpanded = false;
			remainingWidth = windowWidth - typesWidth - docsWidth;
			maxExpandedEditors = Math.floor(remainingWidth / MIN_EDITOR_WIDTH);
		}

		// Always expand at least the active editor
		if (maxExpandedEditors < 1) {
			maxExpandedEditors = 1;
		}

		// Expand editors around the active one symmetrically
		let expandedIndices: number[] = [validActiveIndex];

		if (maxExpandedEditors > 1) {
			// How many editors to add on each side
			const slotsToFill = Math.min(maxExpandedEditors - 1, totalEditors - 1);

			// Expand symmetrically around active editor
			for (let offset = 1; offset <= slotsToFill; offset++) {
				const leftIndex = validActiveIndex - offset;
				const rightIndex = validActiveIndex + offset;

				// Alternate left and right to maintain symmetry
				if (offset % 2 === 1) {
					// Odd offset: try right first, then left
					if (rightIndex < totalEditors && !expandedIndices.includes(rightIndex)) {
						expandedIndices.push(rightIndex);
						if (expandedIndices.length >= maxExpandedEditors) break;
					}
					if (leftIndex >= 0 && !expandedIndices.includes(leftIndex)) {
						expandedIndices.push(leftIndex);
						if (expandedIndices.length >= maxExpandedEditors) break;
					}
				} else {
					// Even offset: try left first, then right
					if (leftIndex >= 0 && !expandedIndices.includes(leftIndex)) {
						expandedIndices.push(leftIndex);
						if (expandedIndices.length >= maxExpandedEditors) break;
					}
					if (rightIndex < totalEditors && !expandedIndices.includes(rightIndex)) {
						expandedIndices.push(rightIndex);
						if (expandedIndices.length >= maxExpandedEditors) break;
					}
				}
			}
		}

		const expandedCount = expandedIndices.length;

		const end = performance.now();
		console.log(
			`[Layout Calc] ${(end - start).toFixed(3)}ms | Editors: ${totalEditors} | Expanded: ${expandedCount} | Window: ${windowWidth}px`
		);

		return {
			totalEditors,
			expandedCount,
			collapsedCount: totalEditors - expandedCount,
			typesCollapsed: !typesExpanded,
			docsCollapsed: !docsExpanded,
			expandedIndices,
			activeIndex: validActiveIndex,
			typesExpanded,
			docsExpanded
		};
	});

	let typesPanel = $derived.by(() => {
		if (windowWidth < 620) {
			return mobileView === 'types' ? 'w-full' : 'hidden';
		}

		return layoutConfig.typesExpanded ? 'w-[350px]' : 'w-[60px]';
	});

	let documentsPanelState = $derived.by(() => {
		if (windowWidth < 620) {
			return { visible: mobileView === 'documents', width: 'full' };
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

	// Watch URL params for bookmarkable navigation
	$effect(() => {
		const url = page.url;
		const docType = url.searchParams.get('docType');
		const action = url.searchParams.get('action');
		const docId = url.searchParams.get('docId');
		const stackParam = url.searchParams.get('stack');

		if (action === 'create' && docType) {
			currentView = 'editor';
			mobileView = 'editor';
			selectedDocumentType = docType;
			isCreatingDocument = true;
			editingDocumentId = null;
			editorStack = [];
			fetchDocuments(docType);
		} else if (docId) {
			currentView = 'editor';
			mobileView = 'editor';
			editingDocumentId = docId;
			isCreatingDocument = false;

			// Parse stack param to restore stacked editors
			if (stackParam) {
				const stackItems = stackParam.split(',').map((item) => {
					const [type, id] = item.split(':');
					return { documentType: type, documentId: id, isCreating: false };
				});
				editorStack = stackItems;
				// Set active editor to the last stacked editor
				activeEditorIndex = stackItems.length; // 0 = primary, so stackItems.length is the last stacked editor
			} else {
				editorStack = [];
				activeEditorIndex = 0; // Primary editor is active
			}

			if (docType) {
				selectedDocumentType = docType;
				if (documentsList.length === 0 || selectedDocumentType !== docType) {
					fetchDocuments(docType);
				}
			} else {
				fetchDocumentForEditing(docId);
			}
		} else if (docType) {
			currentView = 'documents';
			mobileView = 'documents';
			selectedDocumentType = docType;
			editingDocumentId = null;
			isCreatingDocument = false;
			editorStack = [];
			fetchDocuments(docType);
		} else {
			currentView = 'dashboard';
			mobileView = 'types';
			selectedDocumentType = null;
			editingDocumentId = null;
			isCreatingDocument = false;
			editorStack = [];
		}
	});

	async function navigateToDocumentType(docType: string) {
		await goto(`/admin?docType=${docType}`, { replaceState: false });
		mobileView = 'documents';
	}

	async function navigateToCreateDocument(docType: string) {
		await goto(`/admin?docType=${docType}&action=create`, { replaceState: false });
		mobileView = 'editor';
	}

	async function navigateToEditDocument(docId: string, docType?: string, replace: boolean = false) {
		const params = new SvelteURLSearchParams({ docId });
		if (docType) params.set('docType', docType);
		await goto(`/admin?${params.toString()}`, { replaceState: replace });
		mobileView = 'editor';
	}

	// Handle opening reference in new editor panel
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

		// On desktop, add to editor stack
		const newStack = [...editorStack, { documentId, documentType, isCreating: false }];

		// Build stack param string: type1:id1,type2:id2,...
		const stackParam = newStack.map((item) => `${item.documentType}:${item.documentId}`).join(',');

		// Update URL with new stack
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('stack', stackParam);
		await goto(`/admin?${params.toString()}`, { replaceState: false });

		// Set the new editor as active
		activeEditorIndex = newStack.length; // 0 = primary, so stack.length is the new editor
	}

	// Close editor from stack
	async function handleCloseStackedEditor(index: number) {
		const newStack = editorStack.slice(0, index);

		// Update URL
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

		// Reset active editor to the last one
		activeEditorIndex = Math.min(activeEditorIndex, newStack.length);
	}

	// Set active editor when clicking on a strip
	function setActiveEditor(index: number) {
		activeEditorIndex = index;
	}

	async function navigateBack() {
		// Check if we came from another document (mobile reference navigation)
		const fromDocId = page.url.searchParams.get('fromDocId');
		const fromDocType = page.url.searchParams.get('fromDocType');

		if (fromDocId && fromDocType) {
			// Navigate back to the document we came from
			await navigateToEditDocument(fromDocId, fromDocType, false);
		} else if (selectedDocumentType) {
			// Navigate back to document list
			await goto(`/admin?docType=${selectedDocumentType}`, { replaceState: false });
		} else {
			// Navigate back to home
			await goto(resolve('/admin'), { replaceState: false });
		}
	}

	function handleAutoSave(documentId: string, title: string) {
		if (documentsList.length > 0) {
			documentsList = documentsList.map((doc) =>
				doc.id === documentId ? { ...doc, title: title } : doc
			);
		}
	}

	async function fetchDocumentForEditing(docId: string) {
		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/documents/${docId}`);
			const result = await response.json();

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
			console.error('Failed to fetch document:', err);
			error = err instanceof Error ? err.message : 'Failed to load document';
			await goto('/admin', { replaceState: true });
		} finally {
			loading = false;
		}
	}

	async function fetchDocuments(docType: string) {
		loading = true;
		error = null;

		try {
			const response = await fetch(`/api/documents?docType=${docType}&limit=50`);
			const result = await response.json();

			if (result.success && result.data) {
				documentsList = result.data.map((doc: any) => {
					const docData = doc.draftData || doc.publishedData || {};
					return {
						id: doc.id,
						title: docData.title || `Untitled`,
						status: doc.status,
						publishedAt: doc.publishedAt ? new Date(doc.publishedAt) : null,
						updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : null,
						createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
						hasChanges:
							doc.status === 'published' &&
							doc.draftData !== null &&
							JSON.stringify(doc.draftData) !== JSON.stringify(doc.publishedData)
					};
				});
			} else {
				throw new Error(result.error || 'Failed to fetch documents');
			}
		} catch (err) {
			console.error('Failed to fetch documents:', err);
			error = err instanceof Error ? err.message : 'Failed to load documents';
			documentsList = [];
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>{activeTab === 'structure' ? 'Content' : 'Vision'} - {title}</title>
</svelte:head>

<div class="border-border bg-background border-b">
	<div class="flex h-12 items-center px-4">
		<!-- Centered Tabs -->
		<div class="mx-auto">
			<Tabs.Root bind:value={activeTab}>
				<Tabs.List class="flex h-auto border-none bg-transparent p-0">
					<Tabs.Trigger
						value="structure"
						class="data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground hover:text-foreground data-[state=active]:after:bg-primary relative border-none bg-transparent px-4
              py-2 text-sm
              font-medium shadow-none transition-colors
              data-[state=active]:bg-transparent data-[state=active]:after:absolute
              data-[state=active]:after:bottom-0 data-[state=active]:after:left-0
              data-[state=active]:after:right-0 data-[state=active]:after:h-0.5"
					>
						Structure
					</Tabs.Trigger>
					<Tabs.Trigger
						value="vision"
						class="data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground hover:text-foreground data-[state=active]:after:bg-primary relative border-none bg-transparent px-4
              py-2 text-sm
              font-medium shadow-none transition-colors
              data-[state=active]:bg-transparent data-[state=active]:after:absolute
              data-[state=active]:after:bottom-0 data-[state=active]:after:left-0
              data-[state=active]:after:right-0 data-[state=active]:after:h-0.5"
					>
						Vision
					</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>
		</div>

		<!-- Right-aligned button -->
		<div class="absolute right-4">
			<Button onclick={toggleMode} variant="outline" size="icon">
				<SunIcon
					class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 !transition-all dark:-rotate-90 dark:scale-0"
				/>
				<MoonIcon
					class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 !transition-all dark:rotate-0 dark:scale-100"
				/>
				<span class="sr-only">Toggle theme</span>
			</Button>
		</div>
	</div>
</div>

<!-- Mobile breadcrumb navigation (< 620px) -->
<div class="{windowWidth < 620 ? 'block' : 'hidden'} border-border bg-background border-b">
	<div class="flex h-12 items-center px-4">
		{#if mobileView === 'documents' && selectedDocumentType}
			<button
				onclick={async () => {
					mobileView = 'types';
					await goto('/admin', { replaceState: false });
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
				{(documentTypes.find((t) => t.name === selectedDocumentType)?.title ||
					selectedDocumentType) + 's'}
			</span>
		{:else if mobileView === 'editor'}
			<button onclick={navigateBack} class="text-muted-foreground hover:text-foreground text-sm">
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
			</button>
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

<!-- Main Content -->
<div class="{windowWidth < 620 ? 'h-[calc(100vh-6rem)]' : 'h-[calc(100vh-3rem)]'} overflow-hidden">
	<Tabs.Root bind:value={activeTab} class="h-full">
		<Tabs.Content value="structure" class="h-full overflow-hidden">
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
						class="border-r transition-all duration-200 {windowWidth < 620
							? typesPanel === 'hidden'
								? 'hidden'
								: 'h-full w-screen'
							: typesPanel} {typesPanel === 'hidden' ? 'hidden' : 'block'} h-full overflow-hidden"
					>
						{#if typesPanel === 'w-[60px]'}
							<button
								onclick={() => setActiveEditor(-1)}
								class="hover:bg-muted/30 flex h-full w-full flex-col transition-colors"
								title="Click to expand content types"
							>
								<div class="flex flex-1 items-start justify-center p-2 pt-8 text-left">
									<div
										class="text-foreground rotate-90 transform whitespace-nowrap text-sm font-medium"
									>
										Content
									</div>
								</div>
							</button>
						{:else}
							<div class="h-full overflow-y-auto">
								{#if hasDocumentTypes}
									{#each documentTypes as docType, index (index)}
										<button
											onclick={() => navigateToDocumentType(docType.name)}
											class="hover:bg-muted/50 border-border group flex w-full items-center justify-between border-b p-3 text-left transition-colors first:border-t {selectedDocumentType ===
											docType.name
												? 'bg-muted/50'
												: ''}"
										>
											<div class="flex items-center gap-3">
												<div class="flex h-6 w-6 items-center justify-center">
													<span class="text-muted-foreground">📄</span>
												</div>
												<div>
													<h3 class="text-sm font-medium">{docType.title}s</h3>
													{#if docType.description}
														<p class="text-muted-foreground text-xs">{docType.description}</p>
													{/if}
												</div>
											</div>
											<div
												class="text-muted-foreground group-hover:text-foreground transition-colors"
											>
												<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M9 5l7 7-7 7"
													/>
												</svg>
											</div>
										</button>
									{/each}
								{:else}
									<div class="p-6 text-center">
										<div
											class="bg-muted/50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
										>
											<span class="text-muted-foreground text-xl">📄</span>
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
							class="h-full overflow-hidden border-r transition-all duration-200
              {!documentsPanelState.visible ? 'hidden' : 'block'}
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
									class="hover:bg-muted/30 flex h-full w-full flex-col transition-colors"
									title="Click to expand documents list"
								>
									<div class="flex flex-1 items-start justify-center p-2 pt-8 text-left">
										<div class="text-foreground rotate-90 transform text-sm font-medium">
											{(documentTypes.find((t) => t.name === selectedDocumentType)?.title ||
												selectedDocumentType) + 's'}
										</div>
									</div>
								</button>
							{:else}
								<div class="border-border bg-muted/20 border-b p-3">
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-3">
											<div class="flex h-6 w-6 items-center justify-center">
												<span class="text-muted-foreground">📄</span>
											</div>
											<div>
												<h3 class="text-sm font-medium">
													{(documentTypes.find((t) => t.name === selectedDocumentType)?.title ||
														selectedDocumentType) + 's'}
												</h3>
												<p class="text-muted-foreground text-xs">
													{documentsList.length} document{documentsList.length !== 1 ? 's' : ''}
												</p>
											</div>
										</div>
										<Button
											size="sm"
											variant="ghost"
											onclick={() => navigateToCreateDocument(selectedDocumentType!)}
											class="h-8 w-8 p-0"
											title="Create new document"
										>
											<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 4v16m8-8H4"
												/>
											</svg>
										</Button>
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
										<div class="p-3 text-center">
											<div class="text-muted-foreground text-sm">Loading...</div>
										</div>
									{:else if documentsList.length > 0}
										{#each documentsList as doc, index (index)}
											<button
												onclick={() => navigateToEditDocument(doc.id, selectedDocumentType!)}
												class="hover:bg-muted/50 border-border group flex w-full items-center justify-between border-b p-3 text-left transition-colors"
											>
												<div class="flex min-w-0 flex-1 items-center gap-3">
													<div class="flex h-6 w-6 items-center justify-center">
														<span class="text-muted-foreground">📄</span>
													</div>
													<div class="min-w-0 flex-1">
														<h3 class="truncate text-sm font-medium">{doc.title}</h3>
														{#if doc.slug}
															<p class="text-muted-foreground text-xs">/{doc.slug}</p>
														{:else if doc.status}
															<p class="text-muted-foreground text-xs">{doc.status}</p>
														{/if}
													</div>
												</div>
												<div class="text-muted-foreground text-xs">
													{doc.updatedAt?.toLocaleDateString() || ''}
												</div>
											</button>
										{/each}
									{:else}
										<div class="p-6 text-center">
											<div
												class="bg-muted/50 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
											>
												<span class="text-muted-foreground text-xl">📄</span>
											</div>
											<h3 class="mb-2 font-medium">No documents found</h3>
											<p class="text-muted-foreground text-sm">
												Create your first {selectedDocumentType} document using the + button above
											</p>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/if}

					<!-- Primary Editor Panel -->
					{#if primaryEditorState.visible}
						{#if primaryEditorState.expanded}
							<div
								class="transition-all duration-200 {windowWidth < 620
									? 'w-screen'
									: 'flex-1'} h-full overflow-y-auto"
								style={windowWidth >= 620 ? 'min-width: 0;' : ''}
							>
								<DocumentEditor
									{schemas}
									documentType={selectedDocumentType!}
									documentId={editingDocumentId}
									isCreating={isCreatingDocument}
									onBack={navigateBack}
									onOpenReference={handleOpenReference}
									onSaved={async (docId) => {
										if (selectedDocumentType) {
											await fetchDocuments(selectedDocumentType);
										}
										navigateToEditDocument(docId, selectedDocumentType!);
									}}
									onAutoSaved={handleAutoSave}
									onPublished={async (docId) => {
										if (selectedDocumentType) {
											await fetchDocuments(selectedDocumentType);
										}
									}}
									onDeleted={async () => {
										if (selectedDocumentType) {
											await fetchDocuments(selectedDocumentType);
											await goto(`/admin?docType=${selectedDocumentType}`, { replaceState: false });
										} else {
											await goto('/admin', { replaceState: false });
										}
									}}
								/>
							</div>
						{:else}
							<!-- Collapsed Primary Editor Strip -->
							<button
								onclick={() => setActiveEditor(0)}
								class="hover:bg-muted/50 flex h-full w-[60px] flex-col border-l transition-colors"
								title="Click to expand {selectedDocumentType}"
							>
								<div class="mt-7 flex flex-1 items-start justify-center p-2 pt-8 text-left">
									<div class="text-foreground rotate-90 transform text-sm font-medium">
										{selectedDocumentType
											? selectedDocumentType.charAt(0).toUpperCase() + selectedDocumentType.slice(1)
											: ''}
									</div>
								</div>
							</button>
						{/if}
					{/if}

					<!-- Stacked Reference Editors -->
					{#each editorStack as stackedEditor, index (stackedEditor.documentId)}
						{@const editorIndex = index + 1}
						{@const isExpanded = layoutConfig.expandedIndices.includes(editorIndex)}

						{#if isExpanded}
							<div
								class="h-full flex-1 overflow-y-auto border-l transition-all duration-200"
								style="min-width: 0;"
							>
								<DocumentEditor
									{schemas}
									documentType={stackedEditor.documentType}
									documentId={stackedEditor.documentId}
									isCreating={stackedEditor.isCreating}
									onBack={() => handleCloseStackedEditor(index)}
									onOpenReference={handleOpenReference}
									onSaved={async (docId) => {}}
									onAutoSaved={() => {}}
									onPublished={async (docId) => {}}
									onDeleted={async () => {
										handleCloseStackedEditor(index);
									}}
								/>
							</div>
						{:else}
							<!-- Collapsed Stacked Editor Strip -->
							<button
								onclick={() => setActiveEditor(editorIndex)}
								class="hover:bg-muted/50 flex h-full w-[60px] flex-col border-l transition-colors"
								title="Click to expand {stackedEditor.documentType}"
							>
								<div class="-mt-2 flex h-full flex-1 items-start justify-center p-2 pt-8 text-left">
									<div
										class="text-foreground rotate-90 transform whitespace-nowrap text-sm font-medium"
									>
										{stackedEditor.documentType.charAt(0).toUpperCase() +
											stackedEditor.documentType.slice(1)}
									</div>
								</div>
							</button>
						{/if}
					{/each}
				{/if}
			</div>
		</Tabs.Content>

		<Tabs.Content value="vision" class="m-0 h-full p-0">
			<div class="bg-muted/10 flex h-full items-center justify-center">
				<div class="space-y-4 text-center">
					<div
						class="bg-primary/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full"
					>
						<svg class="text-primary h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
							href="/api/graphql"
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
	</Tabs.Root>
</div>
