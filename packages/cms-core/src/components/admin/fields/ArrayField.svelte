<script lang="ts">
	import { Button } from '@aphex/ui/shadcn/button';
	import * as DropdownMenu from '@aphex/ui/shadcn/dropdown-menu';
	import type { ArrayField as ArrayFieldType, SchemaType } from '../../../types.js';
	import { getArrayTypes, getSchemaByName } from '../../../schema-utils/utils.js';
	import { getSchemaContext } from '../../../schema-context.svelte.js';
	import ObjectModal from '../ObjectModal.svelte';

	interface Props {
		field: ArrayFieldType;
		value: any;
		onUpdate: (value: any) => void;
		onOpenReference?: (documentId: string, documentType: string) => void;
	}

	let { field, value, onUpdate, onOpenReference }: Props = $props();

	// Get schemas from context
	const schemas = getSchemaContext();

	// Get available types for this array field
	const availableTypes = $derived(getArrayTypes(schemas, field));

	// Modal state
	let modalOpen = $state(false);
	let editingIndex = $state<number | null>(null);
	let editingType = $state<string | null>(null);
	let editingSchema = $state<SchemaType | null>(null);
	let editingValue = $state<Record<string, any>>({});

	// Ensure value is always an array
	const arrayValue = $derived(Array.isArray(value) ? value : []);

	function handleTypeSelected(selectedType: string) {
		if (!selectedType) return;

		// Get the schema for the selected type
		const schema = getSchemaByName(schemas, selectedType);
		if (!schema) return;

		// Initialize empty object with default values
		const newItem: Record<string, any> = { _type: selectedType };

		if (schema.fields) {
			schema.fields.forEach((field) => {
				if (field.type === 'boolean' && 'initialValue' in field) {
					newItem[field.name] = field.initialValue;
				} else {
					newItem[field.name] = '';
				}
			});
		}

		// Set modal state directly
		editingIndex = arrayValue.length; // New item index
		editingType = selectedType;
		editingSchema = schema;
		editingValue = newItem;
		modalOpen = true;
	}

	function handleEditItem(index: number) {
		const item = arrayValue[index];
		if (!item._type) return;

		const schema = getSchemaByName(schemas, item._type);
		if (!schema) return;

		editingIndex = index;
		editingType = item._type;
		editingSchema = schema;
		editingValue = item;
		modalOpen = true;
		console.log('MODAL IS OPEN: ', modalOpen);
	}

	function handleRemoveItem(index: number) {
		const newArray = arrayValue.filter((_, i) => i !== index);
		onUpdate(newArray);
	}

	function handleModalSave(editedData: Record<string, any>) {
		if (editingIndex === null || !editingType) return;

		// Add the type information to the data
		const itemData = { ...editedData, _type: editingType };

		const newArray = [...arrayValue];

		if (editingIndex >= newArray.length) {
			// Adding new item
			newArray.push(itemData);
		} else {
			// Editing existing item
			newArray[editingIndex] = itemData;
		}

		onUpdate(newArray);

		// Reset modal state
		modalOpen = false;
		editingIndex = null;
		editingType = null;
		editingSchema = null;
		editingValue = {};
	}

	function handleModalClose() {
		modalOpen = false;
		editingIndex = null;
		editingType = null;
		editingSchema = null;
		editingValue = {};
	}

	// Get the title to display for an item
	function getItemTitle(item: any): string {
		if (!item._type) return 'Unknown Item';

		const schema = getSchemaByName(schemas, item._type);
		if (!schema) return item._type;

		// Try to find a meaningful field to use as title
		const titleField = item.title || item.heading || item.name || item.label;
		if (titleField && typeof titleField === 'string' && titleField.trim()) {
			return titleField;
		}

		return schema.title || item._type;
	}
</script>

<div class="border-border space-y-4 rounded-md border p-4">
	<h4 class="text-sm font-medium">{field.title}</h4>

	<!-- Array items -->
	{#if arrayValue.length > 0}
		<div class="space-y-2">
			{#each arrayValue as item, index}
				<div class="border-border/50 space-y-2 rounded border p-3">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="text-muted-foreground text-xs">#{index + 1}</span>
							<h5 class="text-sm font-medium">{getItemTitle(item)}</h5>
							{#if item._type}
								<span class="bg-muted rounded px-2 py-1 text-xs">{item._type}</span>
							{/if}
						</div>

						<div class="flex items-center gap-2">
							<Button
								variant="ghost"
								size="sm"
								onclick={() => {
									handleEditItem(index);
								}}
								class="h-8 w-8 p-0"
								title="Edit item"
							>
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
									/>
								</svg>
							</Button>

							<Button
								variant="ghost"
								size="sm"
								onclick={() => handleRemoveItem(index)}
								class="text-destructive hover:text-destructive h-8 w-8 p-0"
								title="Remove item"
							>
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
							</Button>
						</div>
					</div>

					<!-- Show a preview of the item content -->
					<div class="text-muted-foreground pl-6 text-xs">
						{#if item.title || item.heading}
							{item.title || item.heading}
						{:else if item.description}
							{item.description.substring(0, 100)}{item.description.length > 100 ? '...' : ''}
						{:else}
							Click edit to configure this item
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Add Item section -->
	<div class="border-border border-t pt-2">
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" class="w-full cursor-pointer">
						<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							/>
						</svg>
						Add Item
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content class="w-56">
				{#each availableTypes as type}
					<DropdownMenu.Item onclick={() => handleTypeSelected(type.name)}>
						{type.title}
					</DropdownMenu.Item>
				{/each}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</div>

<!-- Object editing modal -->
{#if editingSchema}
	<ObjectModal
		open={modalOpen}
		schema={editingSchema}
		value={editingValue}
		onClose={handleModalClose}
		onSave={handleModalSave}
		{onOpenReference}
	/>
{/if}
