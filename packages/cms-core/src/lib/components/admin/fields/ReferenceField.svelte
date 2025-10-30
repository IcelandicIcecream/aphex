<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import XIcon from '@lucide/svelte/icons/x';
	import { tick } from 'svelte';
	import * as Command from '@aphexcms/ui/shadcn/command';
	import * as Popover from '@aphexcms/ui/shadcn/popover';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { cn } from '@aphexcms/ui/utils';
	import type { Field, ReferenceField as ReferenceFieldType } from '../../../types/schemas';
	import { documents } from '../../../api/documents';

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
					console.error('Failed to load referenced document:', err);
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
				console.log('[ReferenceField] Opening select box, loading documents for type:', targetType);
				loading = true;
				try {
					const result = await documents.list({
						docType: targetType,
						limit: 10
					});
					console.log('[ReferenceField] Documents loaded:', result);
					if (result.success && result.data) {
						searchResults = result.data;
						console.log('[ReferenceField] Search results:', searchResults.length, 'documents');
					}
				} catch (err) {
					console.error('[ReferenceField] Failed to load documents:', err);
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
				draftData: {
					title: 'Untitled'
				}
			});

			if (result.success && result.data) {
				onUpdate(result.data.id);
				closeAndFocusTrigger();
			}
		} catch (err) {
			console.error('Failed to create document:', err);
		} finally {
			creating = false;
		}
	}

	function getDocumentTitle(doc: any): string {
		// Try to get title from draft data first, then published data
		const data = doc.draftData || doc.publishedData || {};
		return data.title || data.name || data.heading || 'Untitled';
	}

	const selectedLabel = $derived(selectedDocument ? getDocumentTitle(selectedDocument) : null);
</script>

{#if selectedDocument}
	<!-- Selected document display -->
	<div class="border-border bg-muted/30 flex items-center gap-2 rounded-md border p-3">
		<div class="flex-1">
			<div class="text-sm font-medium">{getDocumentTitle(selectedDocument)}</div>
			<div class="text-muted-foreground text-xs">
				{targetType} • {selectedDocument.status === 'published' ? '🟢' : '🟡'}
				{selectedDocument.status}
			</div>
		</div>
		<Button
			variant="ghost"
			size="sm"
			onclick={openReference}
			class="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
			title="Edit referenced document"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
				/>
			</svg>
		</Button>
		{#if !readonly}
			<Button
				variant="ghost"
				size="sm"
				onclick={clearSelection}
				class="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
				title="Clear selection"
			>
				<XIcon class="h-4 w-4" />
			</Button>
		{/if}
	</div>
{:else}
	<!-- Search/select interface -->
	{#if readonly}
		<!-- Read-only state: show placeholder -->
		<div
			class="border-input bg-muted/50 flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm"
		>
			<span class="text-muted-foreground">No reference selected</span>
		</div>
	{:else}
		<Popover.Root bind:open>
			<Popover.Trigger bind:ref={triggerRef}>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="outline"
						class="w-full justify-between"
						role="combobox"
						aria-expanded={open}
					>
						{selectedLabel || `Select ${targetType}...`}
						<ChevronsUpDownIcon class="opacity-50" />
					</Button>
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
										No {targetType}s found
									</p>
									<Button size="sm" onclick={createNewDocument} disabled={creating} class="gap-1">
										<PlusIcon class="h-3 w-3" />
										{creating ? 'Creating...' : `Create new ${targetType}`}
									</Button>
								</div>
							</Command.Empty>
						{:else if searchResults.length > 0}
							<Command.Group>
								{#each searchResults as doc (doc.id)}
									<Command.Item
										value={doc.id}
										onSelect={() => selectDocument(doc)}
										class="flex items-center justify-between"
									>
										<div class="flex items-center gap-2">
											<CheckIcon class={cn('h-4 w-4', value !== doc.id && 'text-transparent')} />
											<div>
												<div class="text-sm font-medium">{getDocumentTitle(doc)}</div>
												<div class="text-muted-foreground text-xs">
													{doc.status === 'published' ? '🟢' : '🟡'}
													{doc.status}
												</div>
											</div>
										</div>
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
						{:else}
							<Command.Empty>
								No {targetType}s available
							</Command.Empty>
						{/if}
					</Command.List>
				</Command.Root>
			</Popover.Content>
		</Popover.Root>
	{/if}
{/if}
