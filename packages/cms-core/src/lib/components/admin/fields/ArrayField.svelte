<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Textarea } from '@aphexcms/ui/shadcn/textarea';
	import { Checkbox } from '@aphexcms/ui/shadcn/checkbox';
	import * as DropdownMenu from '@aphexcms/ui/shadcn/dropdown-menu';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import type { ArrayField as ArrayFieldType, SchemaType } from '../../../types/schemas';
	import { getArrayTypes, getSchemaByName } from '../../../schema-utils/utils';
	import { getSchemaContext } from '../../../schema-context.svelte';
	import ObjectModal from '../ObjectModal.svelte';
	import ImageField from './ImageField.svelte';

	interface Props {
		field: ArrayFieldType;
		value: any;
		onUpdate: (value: any) => void;
		onOpenReference?: (documentId: string, documentType: string) => void;
		readonly?: boolean;
	}

	let { field, value, onUpdate, onOpenReference, readonly = false }: Props = $props();

	// Get schemas from context
	const schemas = getSchemaContext();

	// Get schema for a type - either from inline definition or registry
	function getSchemaForType(typeName: string): SchemaType | null {
		// First check if this type has an inline definition in field.of
		// Match by name OR type (since inline objects might use either)
		const inlineDef = field.of?.find((ref) =>
			(ref.name && ref.name === typeName) || ref.type === typeName
		);

		if (inlineDef && inlineDef.fields) {
			// Create a temporary SchemaType from inline definition
			return {
				type: 'object',
				name: inlineDef.name || typeName,
				title: inlineDef.title || typeName,
				fields: inlineDef.fields
			};
		}

		// Otherwise look it up in the schema registry
		return getSchemaByName(schemas, typeName);
	}

	// Determine if this is a primitive array or object array
	// If the type is not found in schemas AND has no inline fields, it's a primitive type
	const isPrimitiveArray = $derived(
		field.of &&
		field.of.length > 0 &&
		field.of[0]?.type &&
		!field.of[0].fields &&  // Not an inline object
		!getSchemaByName(schemas, field.of[0].type)  // Not in registry
	);
	const primitiveType = $derived(isPrimitiveArray ? field.of?.[0]?.type : null);

	// Get available types for this array field (for object arrays)
	const availableTypes = $derived(getArrayTypes(schemas, field));

	// Modal state (for object arrays)
	let modalOpen = $state(false);
	let editingIndex = $state<number | null>(null);
	let editingType = $state<string | null>(null);
	let editingSchema = $state<SchemaType | null>(null);
	let editingValue = $state<Record<string, any>>({});

	// Image modal state
	let imageModalOpen = $state(false);
	let imageModalValue = $state<any>(null);

	// Ensure value is always an array
	const arrayValue = $derived(Array.isArray(value) ? value : []);

	// Primitive array functions
	function handleAddPrimitive() {
		if (readonly) return;

		// For images, open the modal
		if (primitiveType === 'image') {
			imageModalValue = null;
			imageModalOpen = true;
			return;
		}

		// For other primitives, add a new empty item
		const newArray = [...arrayValue];
		const defaultValue = primitiveType === 'boolean' ? false : primitiveType === 'number' ? 0 : '';
		newArray.push(defaultValue);
		onUpdate(newArray);
	}

	function handleUpdatePrimitive(index: number, newValue: any) {
		if (readonly) return;
		const newArray = [...arrayValue];
		newArray[index] = newValue;
		onUpdate(newArray);
	}

	function handleImageModalClose() {
		imageModalOpen = false;
		imageModalValue = null;
	}

	function handleImageUpload(newValue: any) {
		if (newValue) {
			// Auto-add the image to the array
			const newArray = [...arrayValue, newValue];
			onUpdate(newArray);
			// Close the modal
			imageModalOpen = false;
			imageModalValue = null;
		}
	}

	// Object array functions
	function handleTypeSelected(selectedType: string) {
		if (readonly || !selectedType) return;

		// Get the schema for the selected type (inline or from registry)
		const schema = getSchemaForType(selectedType);
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

		const schema = getSchemaForType(item._type);
		if (!schema) return;

		editingIndex = index;
		editingType = item._type;
		editingSchema = schema;
		editingValue = item;
		modalOpen = true;
		console.log('MODAL IS OPEN: ', modalOpen);
	}

	function handleRemoveItem(index: number) {
		if (readonly) return;
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

	{#if isPrimitiveArray}
		<!-- Primitive array UI -->
		{#if arrayValue.length === 0}
			<!-- Empty state -->
			<div class="border-border/50 bg-muted/30 flex items-center justify-center rounded border border-dashed p-6">
				<p class="text-muted-foreground text-sm">No items</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each arrayValue as item, index (index)}
					{#if primitiveType === 'image'}
						<!-- Image item in compact mode -->
						<ImageField
							field={{
								...field.of?.[0],
								name: `image-${index}`,
								type: 'image',
								title: `Image ${index + 1}`
							}}
							value={item}
							onUpdate={(newValue) => {
								const newArray = [...arrayValue];
								if (newValue === null) {
									// Remove the image if null
									newArray.splice(index, 1);
								} else {
									newArray[index] = newValue;
								}
								onUpdate(newArray);
							}}
							{readonly}
							compact={true}
						/>
					{:else}
						<!-- Always-editable primitive with options menu -->
						<div class="border-border/50 flex items-center gap-2 rounded border p-2">
							<span class="text-muted-foreground text-xs">#{index + 1}</span>
							{#if primitiveType === 'boolean'}
								<div class="flex flex-1 items-center gap-2">
									<Checkbox
										checked={item}
										onCheckedChange={(checked) => handleUpdatePrimitive(index, checked)}
										disabled={readonly}
									/>
									<span class="text-sm">{item ? 'True' : 'False'}</span>
								</div>
							{:else if primitiveType === 'text'}
								<Textarea
									value={item}
									oninput={(e) => handleUpdatePrimitive(index, e.currentTarget.value)}
									readonly={readonly}
									class="flex-1"
									rows={3}
									placeholder="Enter text..."
								/>
							{:else if primitiveType === 'number'}
								<Input
									type="number"
									value={item}
									oninput={(e) => handleUpdatePrimitive(index, parseFloat(e.currentTarget.value) || 0)}
									readonly={readonly}
									class="flex-1"
									placeholder="Enter number..."
								/>
							{:else}
								<Input
									value={item}
									oninput={(e) => handleUpdatePrimitive(index, e.currentTarget.value)}
									readonly={readonly}
									class="flex-1"
									placeholder="Enter value..."
								/>
							{/if}
							{#if !readonly}
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										<Button variant="ghost" size="sm" class="h-8 w-8 p-0">
											<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
												/>
											</svg>
										</Button>
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
										<DropdownMenu.Item onclick={() => handleRemoveItem(index)}>
											<svg class="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
												/>
											</svg>
											Remove
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		{/if}

		<!-- Add primitive item section -->
		{#if !readonly}
			<Button variant="outline" class="w-full" onclick={handleAddPrimitive}>
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
		{/if}
	{:else}
		<!-- Object array UI (existing code) -->
		{#if arrayValue.length === 0}
			<!-- Empty state -->
			<div class="border-border/50 bg-muted/30 flex items-center justify-center rounded border border-dashed p-6">
				<p class="text-muted-foreground text-sm">No items</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each arrayValue as item, index (index)}
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
									title={readonly ? 'View item' : 'Edit item'}
								>
									{#if readonly}
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											/>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
											/>
										</svg>
									{:else}
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
											/>
										</svg>
									{/if}
								</Button>

								{#if !readonly}
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
								{/if}
							</div>
						</div>

						<!-- Show a preview of the item content -->
						<div class="text-muted-foreground pl-6 text-xs">
							{#if item.title || item.heading}
								{item.title || item.heading}
							{:else if item.description}
								{item.description.substring(0, 100)}{item.description.length > 100 ? '...' : ''}
							{:else}
								{readonly ? 'Click view to see details' : 'Click edit to configure this item'}
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Add Item section (hidden for read-only) -->
		{#if !readonly}
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
						{#each availableTypes as type, index (index)}
							<DropdownMenu.Item onclick={() => handleTypeSelected(type.name)}>
								{type.title}
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		{/if}
	{/if}
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
		{readonly}
	/>
{/if}

<!-- Image upload modal -->
{#if imageModalOpen}
	<div
		class="bg-background/80 fixed bottom-0 left-0 right-0 top-12 z-[100] flex items-center justify-center p-6 backdrop-blur-xs sm:absolute sm:top-0 sm:p-4"
		onclick={(e) => {
			if (e.target === e.currentTarget) handleImageModalClose();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') handleImageModalClose();
		}}
		role="button"
		tabindex="-1"
	>
		<Card.Root class="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden shadow-lg">
			<Card.Header class="border-b">
				<div class="flex items-center justify-between">
					<div>
						<Card.Title>{field.title} - Add Image</Card.Title>
						<Card.Description>Upload a new image to add to the array</Card.Description>
					</div>
					<Button variant="ghost" size="icon" onclick={handleImageModalClose}>
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
			</Card.Header>

			<Card.Content class="flex-1 overflow-auto">
				<ImageField
					field={{
						...field.of?.[0],
						name: 'image',
						type: 'image',
						title: 'Image'
					}}
					value={imageModalValue}
					onUpdate={handleImageUpload}
				/>
			</Card.Content>
		</Card.Root>
	</div>
{/if}
