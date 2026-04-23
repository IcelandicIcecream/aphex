<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import { tick } from 'svelte';
	import * as Command from '@aphexcms/ui/shadcn/command';
	import * as Popover from '@aphexcms/ui/shadcn/popover';
	import * as DropdownMenu from '@aphexcms/ui/shadcn/dropdown-menu';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { cn } from '@aphexcms/ui/utils';
	import { ExternalLink, Ellipsis, Trash2, FileText } from '@lucide/svelte';
	import type { Field, ReferenceField as ReferenceFieldType } from '../../../types/schemas';
	import { documents } from '../../../api/documents';
	import { getSchemaContext } from '../../../schema-context.svelte';
	import { getSchemaByName } from '../../../schema-utils/utils';
	import { toast } from 'svelte-sonner';
	import { cmsLogger } from '../../../utils/logger';
	import { pluralize } from '../../../utils/pluralize';

	interface Props {
		field: Field;
		value: string | null; // Document ID
		onUpdate: (value: string | null) => void;
		onOpenReference?: (documentId: string, documentType: string) => void;
		readonly?: boolean;
	}

	let { field, value, onUpdate, onOpenReference, readonly = false }: Props = $props();

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
	let triggerRef = $state<HTMLButtonElement>(null!);

	// Load selected document details when value changes
	$effect(() => {
		async function loadDocument() {
			if (value) {
				try {
					const doc = await documents.getById(value);
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

	// Load documents when dropdown opens
	$effect(() => {
		async function loadDocuments() {
			if (open && targetType) {
				cmsLogger.debug(
					'[ReferenceField] Opening select box, loading documents for type:',
					targetType
				);
				loading = true;
				try {
					const result = await documents.list({
						docType: targetType,
						limit: 10
					});
					cmsLogger.debug('[ReferenceField] Documents loaded:', result);
					if (result.success && result.data) {
						searchResults = result.data;
						cmsLogger.debug('[ReferenceField] Search results:', searchResults.length, 'documents');
					}
				} catch (err) {
					toast.error('Failed to load documents');
					searchResults = [];
				} finally {
					loading = false;
				}
			}
		}
		loadDocuments();
	});

	function closeAndFocusTrigger() {
		open = false;
		tick().then(() => {
			triggerRef?.focus();
		});
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
		// With LocalAPI, data is flattened at top level
		return doc.title || doc.name || doc.heading || 'Untitled';
	}

	const selectedLabel = $derived(selectedDocument ? getDocumentTitle(selectedDocument) : null);
</script>

{#if selectedDocument}
	<!-- Selected document — row styled like an ArrayField item -->
	<div
		class="border-border/50 bg-background hover:bg-muted/50 flex h-10 items-center gap-1 rounded border px-1 transition-colors"
	>
		<!-- Type icon -->
		<div class="text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center">
			{#if TargetIcon}
				<TargetIcon class="h-4 w-4" />
			{:else}
				<FileText class="h-4 w-4" />
			{/if}
		</div>

		<!-- Title + status dot (clickable to open referenced document) -->
		<button
			class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
			onclick={openReference}
			title="Open referenced document"
		>
			<span class="truncate text-sm">{getDocumentTitle(selectedDocument)}</span>
			{#if selectedDocument.status === 'published'}
				<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" title="Published"></span>
			{:else if selectedDocument.status === 'unpublished'}
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
						onclick={clearSelection}
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
	<!-- Empty state: dashed "Add reference" button that opens a search popover -->
	<Popover.Root bind:open>
		<Popover.Trigger bind:ref={triggerRef}>
			{#snippet child({ props })}
				<button
					{...props}
					class="border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded border border-dashed text-sm transition-colors"
					role="combobox"
					aria-expanded={open}
				>
					<PlusIcon class="h-4 w-4" />
					Add {targetType || 'reference'}...
				</button>
			{/snippet}
		</Popover.Trigger>
		<Popover.Content class="!z-[9999] w-[400px] p-0">
			<Command.Root>
				<Command.List>
					{#if loading}
						<Command.Loading>Loading...</Command.Loading>
					{:else if searchResults.length === 0}
						<Command.Empty>
							<div class="flex flex-col items-center gap-2 py-4">
								<p class="text-muted-foreground text-sm">
									No {pluralize(targetType || '')} found
								</p>
								<Button size="sm" onclick={createNewDocument} disabled={creating} class="gap-1">
									<PlusIcon class="h-3 w-3" />
									{creating ? 'Creating...' : `Create new ${targetType}`}
								</Button>
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
										<span class="truncate text-sm">{getDocumentTitle(doc)}</span>
									</div>
									{#if doc.status === 'published'}
										<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" title="Published"
										></span>
									{:else if doc.status === 'unpublished'}
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
						<Command.Separator />
						<Command.Group>
							<Command.Item onSelect={createNewDocument} class="justify-center">
								<div class="flex items-center gap-1">
									<PlusIcon class="h-3 w-3" />
									{creating ? 'Creating...' : `Create new ${targetType}`}
								</div>
							</Command.Item>
						</Command.Group>
					{/if}
				</Command.List>
			</Command.Root>
		</Popover.Content>
	</Popover.Root>
{/if}
