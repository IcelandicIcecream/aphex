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
	import {
		resolvePreviewTitle,
		resolvePreviewSubtitle,
		titleFieldName
	} from '../../../utils/preview';
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
	/** The search text when the multi-type Create menu opened — see that menu. */
	let menuName = '';

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

	/**
	 * The picker searches on the server, with the same full-text index as the document
	 * list, so every document is reachable however large the collection. An empty query
	 * shows the first `PICKER_LIMIT` of each type to browse; typing narrows from all of them.
	 */
	const PICKER_LIMIT = 50;
	const SEARCH_DEBOUNCE_MS = 250;

	/** Bumped per request, so a slow response for an earlier query never replaces a newer one. */
	let searchRequest = 0;

	async function fetchDocs(search: string) {
		if (targetTypes.length === 0) return;
		const request = ++searchRequest;
		loading = true;
		try {
			// One request per allowed type — a multi-type reference must be able to
			// offer all of them, not just the first.
			const results = await Promise.all(
				targetTypes.map((docType) =>
					documents.list({ docType, limit: PICKER_LIMIT, search: search || undefined })
				)
			);
			if (request !== searchRequest) return;
			searchResults = results.flatMap((result) =>
				result.success && result.data ? (result.data as any[]) : []
			);
		} catch {
			if (request === searchRequest) toast.error('Failed to load documents');
		} finally {
			if (request === searchRequest) loading = false;
		}
	}

	// Search as the user types: at once when the picker opens, debounced while typing.
	let searchedOnOpen = false;
	$effect(() => {
		const q = query.trim();
		if (!open) {
			searchedOnOpen = false;
			searchRequest++;
			loading = false;
			return;
		}
		if (!searchedOnOpen) {
			searchedOnOpen = true;
			fetchDocs(q);
			return;
		}
		const timer = setTimeout(() => fetchDocs(q), SEARCH_DEBOUNCE_MS);
		return () => clearTimeout(timer);
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

	/**
	 * Create a document of `type`, link it, and open it so the editor fills it in
	 * straight away. A `name` (what was typed into the search) goes into the
	 * schema's title field, so the new row reads as that name — not as the type's
	 * name, which is what an empty document previews as, and which left a row of
	 * identical "Client" entries behind every press of Create.
	 */
	async function createNewDocument(type = targetType, name = query.trim()) {
		if (readonly || !type || creating) return;

		const titleField = name ? titleFieldName(getSchemaByName(schemas, type)) : null;
		creating = true;
		try {
			const result = await documents.create({
				type,
				data: titleField ? { [titleField]: name } : {}
			});

			if (result.success && result.data) {
				onUpdate({ _type: 'reference', _ref: result.data.id });
				closeAndFocusTrigger();
				onOpenReference?.(result.data.id, type);
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

	/**
	 * Offer to create what was typed when nothing already carries that exact name.
	 * An exact match, not "no results": typing "Acme" should still offer to create
	 * it when only "Acme Holdings" exists. Held back while a search is in flight so
	 * the row doesn't flash up before the results that would hide it arrive.
	 */
	const createName = $derived.by(() => {
		const name = query.trim();
		if (!name || loading) return null;
		const lower = name.toLowerCase();
		const exists = searchResults.some((doc) => getDocumentTitle(doc).toLowerCase() === lower);
		return exists ? null : name;
	});
	const createTypes = $derived(
		targetTypes.map((type) => ({ type, title: getSchemaByName(schemas, type)?.title ?? type }))
	);
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
	<!-- Click-outside sits on the whole row, Create button included: closing the
	     dropdown clears the query, and the button needs that query to name the
	     document it creates. -->
	<div class="flex items-center gap-1" use:clickOutside={() => (open = false)}>
		<div bind:this={inputWrapperEl} class="relative min-w-0 flex-1">
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
						<Command.List
							class="max-h-[300px] overflow-y-auto transition-opacity {loading ? 'opacity-50' : ''}"
						>
							{#if loading && searchResults.length === 0}
								<Command.Loading>Loading...</Command.Loading>
							{:else if searchResults.length === 0 && !createName}
								<Command.Empty>
									<div class="text-muted-foreground py-4 text-center text-sm">
										{query.trim()
											? `No ${targetLabel} match "${query}"`
											: `No ${targetLabel} found`}
									</div>
								</Command.Empty>
							{/if}
							{#if searchResults.length > 0}
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
							{#if createName}
								<Command.Group>
									{#each createTypes as { type, title } (type)}
										<Command.Item
											value={`create:${type}`}
											onSelect={() => createNewDocument(type, createName)}
											disabled={creating}
											class="flex items-center gap-2"
										>
											<PlusIcon class="h-4 w-4 shrink-0" />
											<span class="min-w-0 flex-1 truncate text-sm">
												Create "{createName}"{#if createTypes.length > 1}
													<span class="text-muted-foreground"> as {title}</span>{/if}
											</span>
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
			<!-- The menu renders in a portal, outside the click-outside row, so picking
			     an item closes the dropdown and clears the query first. Keep the name
			     from the moment the menu opened. -->
			<DropdownMenu.Root onOpenChange={(isOpen) => isOpen && (menuName = query.trim())}>
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
						<DropdownMenu.Item onclick={() => createNewDocument(type, menuName)}>
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
