<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import * as Command from '@aphexcms/ui/shadcn/command';
	import * as DropdownMenu from '@aphexcms/ui/shadcn/dropdown-menu';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { cn } from '@aphexcms/ui/utils';
	import { ChevronDown, ExternalLink, Ellipsis, Trash2, FileText } from '@lucide/svelte';
	import type { Field, ReferenceField as ReferenceFieldType } from '../../../types/schemas';
	import { documents } from '../../../api/documents';
	import { getSchemaContext } from '../../../schema-context.svelte';
	import { getSchemaByName } from '../../../schema-utils/utils';
	import { toast } from 'svelte-sonner';
	import { pluralize } from '../../../utils/pluralize';
	import { resolvePreviewTitle, resolvePreviewSubtitle } from '../../../utils/preview';
	import { getDocumentVersion } from '../../../document-refresh.svelte';

	type ReferenceValue = { _type: 'reference'; _ref: string; _key?: string };

	interface Props {
		field: Field;
		value: ReferenceValue | null; // Reference wrapper — singular and array share this shape
		onUpdate: (value: ReferenceValue | null) => void;
		onOpenReference?: (documentId: string, documentType: string) => void;
		readonly?: boolean;
		onRemove?: () => void; // When set, the "Remove" menu item calls this instead of clearing the value (used by array-of-references rows)
		preloadedDoc?: unknown; // When provided AND its id matches `value._ref`, skip the per-row getById and use this doc as `selectedDocument` (used by ArrayField to batch-hydrate reference rows in one HTTP call)
	}

	let {
		field,
		value,
		onUpdate,
		onOpenReference,
		readonly = false,
		onRemove,
		preloadedDoc
	}: Props = $props();

	// Pull the target ID off the wrapper (or null when nothing's selected).
	const refId = $derived(value?._ref ?? null);

	// Cast to reference field type
	const referenceField = $derived(field as ReferenceFieldType);

	/**
	 * `to` may name several types (`to: [{type:'page'},{type:'post'}]`) — a link
	 * that can point at either. Everything below therefore works off the list, and
	 * never off `to[0]`: treating the first entry as *the* type is how a post
	 * reference ends up opened with the page schema, which the editor then reports
	 * as a document full of orphaned fields.
	 */
	const targetTypes = $derived(
		(referenceField.to ?? []).map((t) => t.type).filter((t): t is string => Boolean(t))
	);
	/** Only for actions that must pick one: the "create" default and empty-state copy. */
	const targetType = $derived(targetTypes[0]);

	const schemas = getSchemaContext();

	/**
	 * A document's own type.
	 *
	 * The Local API projection puts it on `_meta.type` (`type` is a reserved
	 * document column, so it is never mixed into the content data); the list
	 * endpoint hands back rows that still carry a top-level `type`. Read both
	 * rather than assuming which shape a given caller supplied.
	 */
	function typeOf(doc: unknown): string | undefined {
		const d = doc as { type?: string; _meta?: { type?: string } } | null;
		return d?._meta?.type ?? d?.type;
	}

	/**
	 * The schema to read a document *through*. The stored document knows its own
	 * type, so prefer that and fall back to the declared target only while it is
	 * still loading.
	 */
	function schemaFor(doc: unknown) {
		return getSchemaByName(schemas, typeOf(doc) ?? targetType ?? '') ?? null;
	}

	// State
	let inputWrapperEl = $state<HTMLElement>();
	let dropdownPos = $state({ top: 0, left: 0, width: 0 });
	let open = $state(false);
	let searchResults = $state<any[]>([]);
	let selectedDocument = $state<any>(null);
	let loading = $state(false);
	let creating = $state(false);
	let query = $state('');

	/** "pages", or "pages or posts" for a multi-type reference. */
	const targetLabel = $derived(targetTypes.map((t) => pluralize(t)).join(' or ') || 'documents');

	const selectedSchema = $derived(selectedDocument ? schemaFor(selectedDocument) : null);
	const TargetIcon = $derived(selectedSchema?.icon ?? null);

	// Load selected document details when value changes — and re-load whenever
	// the referenced document is saved elsewhere (the version counter bumps),
	// so the row reflects edits made in a side-panel editor without needing
	// the user to navigate away and back. When the parent (e.g. ArrayField)
	// hands us a preloaded doc whose id matches `value`, use it directly and
	// skip the network call.
	$effect(() => {
		const id = refId;
		// Subscribe to the document's version so this effect re-fires on save.
		getDocumentVersion(id);
		if (id && preloadedDoc && (preloadedDoc as any).id === id) {
			selectedDocument = preloadedDoc;
			return;
		}
		async function loadDocument() {
			if (id) {
				try {
					const doc = await documents.getById(id);
					if (doc.success) {
						selectedDocument = doc.data;
					}
				} catch {
					toast.error('Failed to load referenced document');
					selectedDocument = null;
				}
			} else {
				selectedDocument = null;
			}
		}
		loadDocument();
	});

	// Reset query whenever the popover closes so the next open starts empty.
	$effect(() => {
		if (!open) {
			query = '';
			searchResults = [];
		}
	});

	// All docs cache — fetched once when the dropdown opens, reused for
	// empty-query browsing and client-side filtering while typing.
	let allDocs = $state<any[]>([]);
	let allDocsFetched = $state(false);

	/**
	 * The picker filters CLIENT-SIDE over this cache, so the fetch limit is also the
	 * search limit: anything beyond it can never be found by typing. At 20 that made
	 * documents silently unreachable in any collection larger than a screenful (a menu
	 * of 36 dishes could only ever surface the first 20). Fetch the API maximum instead.
	 *
	 * This raises the ceiling rather than removing it — collections beyond `PICKER_LIMIT`
	 * still need server-side search, which the list endpoint doesn't expose today.
	 */
	const PICKER_LIMIT = 200;

	async function fetchAllDocs() {
		if (allDocsFetched || targetTypes.length === 0) return;
		loading = true;
		try {
			// One request per allowed type — a multi-type reference must be able to
			// offer all of them, not just the first.
			const results = await Promise.all(
				targetTypes.map((docType) => documents.list({ docType, limit: PICKER_LIMIT }))
			);
			allDocs = results.flatMap((result) =>
				result.success && result.data ? (result.data as any[]) : []
			);
		} catch {
			toast.error('Failed to load documents');
		} finally {
			allDocsFetched = true;
			loading = false;
		}
	}

	// Fetch docs when dropdown opens; reset cache when it closes.
	$effect(() => {
		if (open) {
			fetchAllDocs();
		} else {
			query = '';
			searchResults = [];
			allDocs = [];
			allDocsFetched = false;
		}
	});

	// Filter results client-side as the user types. Empty query shows all.
	$effect(() => {
		const q = query.trim().toLowerCase();
		if (!open) return;
		if (!q) {
			searchResults = allDocs;
			return;
		}
		searchResults = allDocs.filter((doc: any) => {
			const title = getDocumentTitle(doc).toLowerCase();
			const subtitle = (getDocumentSubtitle(doc) ?? '').toLowerCase();
			return title.includes(q) || subtitle.includes(q);
		});
	});

	function updateDropdownPos() {
		if (!inputWrapperEl) return;
		const rect = inputWrapperEl.getBoundingClientRect();
		dropdownPos = { top: rect.bottom + 4, left: rect.left, width: rect.width };
	}

	$effect(() => {
		if (open && inputWrapperEl) {
			updateDropdownPos();
		}
	});

	function closeAndFocusTrigger() {
		open = false;
	}

	// Tiny click-outside action for the inline results dropdown — closes the
	// dropdown when the user clicks anywhere outside the wrapper. Cheaper
	// than reaching for a Popover and avoids the focus-stealing problem.
	function clickOutside(node: HTMLElement, callback: () => void) {
		function handle(e: MouseEvent) {
			if (!node.contains(e.target as Node)) callback();
		}
		document.addEventListener('mousedown', handle);
		return {
			destroy() {
				document.removeEventListener('mousedown', handle);
			}
		};
	}

	function selectDocument(doc: any) {
		if (readonly) return;
		onUpdate({ _type: 'reference', _ref: doc.id });
		closeAndFocusTrigger();
	}

	function clearSelection() {
		if (readonly) return;
		onUpdate(null);
		selectedDocument = null;
	}

	function openReference() {
		// The document's own `type`, never the field's first allowed type — see the
		// note on `targetTypes`. Fall back only if the row somehow has no type.
		const type = typeOf(selectedDocument) ?? targetType;
		if (selectedDocument && type && onOpenReference) {
			onOpenReference(selectedDocument.id, type);
		}
	}

	async function createNewDocument(type = targetType) {
		if (readonly || !type) return;

		creating = true;
		try {
			const result = await documents.create({
				type,
				data: {}
			});

			if (result.success && result.data) {
				onUpdate({ _type: 'reference', _ref: result.data.id });
				closeAndFocusTrigger();
			}
		} catch {
			toast.error('Failed to create document');
		} finally {
			creating = false;
		}
	}

	// Each row is previewed through its own schema, so a mixed list (page + post)
	// shows each document's real title rather than reading every row with the
	// first type's preview config.
	function getDocumentTitle(doc: any): string {
		return resolvePreviewTitle(doc, schemaFor(doc));
	}

	function getDocumentSubtitle(doc: any): string | null {
		return resolvePreviewSubtitle(doc, schemaFor(doc));
	}
</script>

{#if selectedDocument}
	<!-- Selected document — row styled like an ArrayField item. Grows to two
	     lines when the target schema's preview config exposes a subtitle. -->
	<div
		class="border-border/50 bg-background hover:bg-muted/50 flex min-h-10 items-center gap-1 rounded border px-1 transition-colors"
	>
		<!-- Type icon -->
		<div class="text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center">
			{#if TargetIcon}
				<TargetIcon class="h-4 w-4" />
			{:else}
				<FileText class="h-4 w-4" />
			{/if}
		</div>

		<!-- Title (+ subtitle) + status dot (clickable to open referenced document) -->
		<button
			class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-1 text-left"
			onclick={openReference}
			title="Open referenced document"
		>
			<span class="flex min-w-0 flex-1 flex-col">
				<span class="truncate text-sm">{getDocumentTitle(selectedDocument)}</span>
				{#if getDocumentSubtitle(selectedDocument)}
					<span class="text-muted-foreground truncate text-xs"
						>{getDocumentSubtitle(selectedDocument)}</span
					>
				{/if}
			</span>
			{#if selectedDocument._meta?.status === 'published'}
				<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" title="Published"></span>
			{:else if selectedDocument._meta?.status === 'unpublished'}
				<span class="bg-muted-foreground/60 h-1.5 w-1.5 shrink-0 rounded-full" title="Unpublished"
				></span>
			{:else}
				<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Draft"></span>
			{/if}
		</button>

		<!-- Context menu -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						class="text-muted-foreground hover:text-foreground flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded transition-colors"
					>
						<Ellipsis class="h-4 w-4" />
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end">
				<DropdownMenu.Item onclick={openReference}>
					<ExternalLink class="mr-2 h-4 w-4" />
					Open
				</DropdownMenu.Item>
				{#if !readonly}
					<DropdownMenu.Separator />
					<DropdownMenu.Item
						class="text-destructive focus:text-destructive"
						onclick={() => (onRemove ? onRemove() : clearSelection())}
					>
						<Trash2 class="mr-2 h-4 w-4" />
						Remove
					</DropdownMenu.Item>
				{/if}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
{:else if readonly}
	<!-- Read-only empty state -->
	<div
		class="border-border/50 bg-muted/30 flex items-center justify-center rounded border border-dashed p-6"
	>
		<p class="text-muted-foreground text-sm">No reference selected</p>
	</div>
{:else}
	<!-- Inline empty state: search input + chevron + Create button. The input
	     is the primary focus target — the results dropdown is a sibling div
	     positioned with fixed so it escapes overflow containers (e.g. modals),
	     with click-outside closing it. No popover wrapping the input, so no
	     double-click. -->
	<div class="flex items-center gap-1">
		<div
			bind:this={inputWrapperEl}
			class="relative min-w-0 flex-1"
			use:clickOutside={() => (open = false)}
		>
			<div
				class="border-input bg-background focus-within:ring-ring flex h-9 items-center rounded-md border focus-within:ring-1"
			>
				<Input
					bind:value={query}
					placeholder="Type to search..."
					onfocus={() => {
						updateDropdownPos();
						open = true;
					}}
					class="h-8 border-0 bg-transparent shadow-none focus-visible:ring-0"
				/>
				<button
					type="button"
					onclick={() => {
						updateDropdownPos();
						open = !open;
					}}
					class="text-muted-foreground hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center"
					aria-label="Toggle results"
				>
					<ChevronDown class="h-4 w-4" />
				</button>
			</div>
			{#if open}
				<div
					class="bg-popover text-popover-foreground fixed z-[9999] rounded-md border p-0 shadow-md"
					style="top: {dropdownPos.top}px; left: {dropdownPos.left}px; width: {Math.min(
						400,
						dropdownPos.width
					)}px;"
				>
					<Command.Root shouldFilter={false}>
						<Command.List class="max-h-[300px] overflow-y-auto">
							{#if loading}
								<Command.Loading>Loading...</Command.Loading>
							{:else if searchResults.length === 0}
								<Command.Empty>
									<div class="text-muted-foreground py-4 text-center text-sm">
										{query.trim()
											? `No ${targetLabel} match "${query}"`
											: `No ${targetLabel} found`}
									</div>
								</Command.Empty>
							{:else}
								<Command.Group>
									{#each searchResults as doc (doc.id)}
										<Command.Item
											value={doc.id}
											onSelect={() => selectDocument(doc)}
											class="flex items-center justify-between"
										>
											<div class="flex min-w-0 flex-1 items-center gap-2">
												<CheckIcon
													class={cn('h-4 w-4 shrink-0', refId !== doc.id && 'text-transparent')}
												/>
												<span class="flex min-w-0 flex-1 flex-col">
													<span class="truncate text-sm">{getDocumentTitle(doc)}</span>
													{#if getDocumentSubtitle(doc)}
														<span class="text-muted-foreground truncate text-xs"
															>{getDocumentSubtitle(doc)}</span
														>
													{/if}
												</span>
											</div>
											{#if doc._meta?.status === 'published'}
												<span
													class="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500"
													title="Published"
												></span>
											{:else if doc._meta?.status === 'unpublished'}
												<span
													class="bg-muted-foreground/60 h-1.5 w-1.5 shrink-0 rounded-full"
													title="Unpublished"
												></span>
											{:else}
												<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Draft"
												></span>
											{/if}
										</Command.Item>
									{/each}
								</Command.Group>
							{/if}
						</Command.List>
					</Command.Root>
				</div>
			{/if}
		</div>
		{#if targetTypes.length > 1}
			<!-- Which type to create is genuinely ambiguous when the field accepts
			     several, so ask instead of silently picking the first. -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger disabled={creating}>
					{#snippet child({ props })}
						<Button {...props} variant="outline" size="sm" class="h-9 shrink-0 gap-1">
							<PlusIcon class="h-4 w-4" />
							{creating ? 'Creating...' : 'Create...'}
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					{#each targetTypes as type (type)}
						<DropdownMenu.Item onclick={() => createNewDocument(type)}>
							{getSchemaByName(schemas, type)?.title ?? type}
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		{:else}
			<Button
				variant="outline"
				size="sm"
				onclick={() => createNewDocument()}
				disabled={creating}
				class="h-9 shrink-0 gap-1"
			>
				<PlusIcon class="h-4 w-4" />
				{creating ? 'Creating...' : 'Create...'}
			</Button>
		{/if}
	</div>
{/if}
