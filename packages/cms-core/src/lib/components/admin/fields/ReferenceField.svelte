<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import * as Command from '@aphexcms/ui/shadcn/command';
	import * as Popover from '@aphexcms/ui/shadcn/popover';
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

	interface Props {
		field: Field;
		value: string | null; // Document ID
		onUpdate: (value: string | null) => void;
		onOpenReference?: (documentId: string, documentType: string) => void;
		readonly?: boolean;
		onRemove?: () => void; // When set, the "Remove" menu item calls this instead of clearing the value (used by array-of-references rows)
		preloadedDoc?: unknown; // When provided AND its id matches `value`, skip the per-row getById and use this doc as `selectedDocument` (used by ArrayField to batch-hydrate reference rows in one HTTP call)
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

	// Cast to reference field type
	const referenceField = field as ReferenceFieldType;
	const targetType = referenceField.to?.[0]?.type;

	const schemas = getSchemaContext();
	const targetSchema = $derived(targetType ? getSchemaByName(schemas, targetType) : null);
	const TargetIcon = $derived(targetSchema?.icon ?? null);

	// State
	let open = $state(false);
	let searchResults = $state<any[]>([]);
	let selectedDocument = $state<any>(null);
	let loading = $state(false);
	let creating = $state(false);
	let query = $state('');
	let searchTimer: ReturnType<typeof setTimeout> | null = null;

	// Load selected document details when value changes — and re-load whenever
	// the referenced document is saved elsewhere (the version counter bumps),
	// so the row reflects edits made in a side-panel editor without needing
	// the user to navigate away and back. When the parent (e.g. ArrayField)
	// hands us a preloaded doc whose id matches `value`, use it directly and
	// skip the network call.
	$effect(() => {
		const id = value;
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
				} catch (err) {
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

	// Search published documents only — references should never point at drafts.
	// Debounced to avoid hammering the API while the user types; the empty-query
	// case skips the fetch entirely so the popover stays quiet until intent.
	$effect(() => {
		const q = query.trim();
		if (!open || !targetType) return;
		if (searchTimer) clearTimeout(searchTimer);
		if (!q) {
			searchResults = [];
			loading = false;
			return;
		}
		loading = true;
		searchTimer = setTimeout(async () => {
			try {
				const result = await documents.list({
					docType: targetType,
					status: 'published',
					limit: 20
				});
				if (result.success && result.data) {
					const needle = q.toLowerCase();
					searchResults = result.data.filter((doc: any) => {
						const title = resolvePreviewTitle(doc, targetSchema).toLowerCase();
						const subtitle = (resolvePreviewSubtitle(doc, targetSchema) ?? '').toLowerCase();
						return title.includes(needle) || subtitle.includes(needle);
					});
				}
			} catch (err) {
				toast.error('Failed to load documents');
				searchResults = [];
			} finally {
				loading = false;
			}
		}, 200);
	});

	function closeAndFocusTrigger() {
		open = false;
	}

	function selectDocument(doc: any) {
		if (readonly) return;
		onUpdate(doc.id);
		closeAndFocusTrigger();
	}

	function clearSelection() {
		if (readonly) return;
		onUpdate(null);
		selectedDocument = null;
	}

	function openReference() {
		if (selectedDocument && targetType && onOpenReference) {
			onOpenReference(selectedDocument.id, targetType);
		}
	}

	async function createNewDocument() {
		if (readonly || !targetType) return;

		creating = true;
		try {
			const result = await documents.create({
				type: targetType,
				data: {
					title: 'Untitled'
				}
			});

			if (result.success && result.data) {
				onUpdate(result.data.id);
				closeAndFocusTrigger();
			}
		} catch (err) {
			toast.error('Failed to create document');
		} finally {
			creating = false;
		}
	}

	function getDocumentTitle(doc: any): string {
		return resolvePreviewTitle(doc, targetSchema);
	}

	function getDocumentSubtitle(doc: any): string | null {
		return resolvePreviewSubtitle(doc, targetSchema);
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
	<!-- Inline empty state: search input + chevron + Create button. Always
	     visible — no "Add reference" click step. The chevron toggles the
	     results popover; focusing the input opens it too. -->
	<div class="flex items-center gap-1">
		<Popover.Root bind:open>
			<div
				class="border-input bg-background focus-within:ring-ring flex h-9 min-w-0 flex-1 items-center rounded-md border focus-within:ring-1"
			>
				<Input
					bind:value={query}
					placeholder="Type to search..."
					onfocus={() => (open = true)}
					class="h-8 border-0 bg-transparent shadow-none focus-visible:ring-0"
				/>
				<Popover.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							class="text-muted-foreground hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center"
							aria-label="Toggle results"
						>
							<ChevronDown class="h-4 w-4" />
						</button>
					{/snippet}
				</Popover.Trigger>
			</div>
			<Popover.Content class="!z-[9999] w-[400px] p-0" align="start">
				<Command.Root shouldFilter={false}>
					<Command.List>
						{#if loading}
							<Command.Loading>Loading...</Command.Loading>
						{:else if !query.trim()}
							<div class="text-muted-foreground px-3 py-6 text-center text-sm">
								Type to search published {pluralize(targetType || '')}
							</div>
						{:else if searchResults.length === 0}
							<Command.Empty>
								<div class="text-muted-foreground py-4 text-center text-sm">
									No published {pluralize(targetType || '')} match "{query}"
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
												class={cn('h-4 w-4 shrink-0', value !== doc.id && 'text-transparent')}
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
										<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" title="Published"
										></span>
									</Command.Item>
								{/each}
							</Command.Group>
						{/if}
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
		<Button
			variant="outline"
			size="sm"
			onclick={createNewDocument}
			disabled={creating}
			class="h-9 shrink-0 gap-1"
		>
			<PlusIcon class="h-4 w-4" />
			{creating ? 'Creating...' : 'Create...'}
		</Button>
	</div>
{/if}
