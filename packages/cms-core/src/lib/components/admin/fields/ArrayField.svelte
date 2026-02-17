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
	import { getDefaultValueForFieldType } from '../../../utils/field-defaults';
	import { DragDropProvider } from '@dnd-kit/svelte';
	import { createSortable } from '@dnd-kit/svelte/sortable';
	import { arrayMove } from '@dnd-kit/helpers';
	import { GripVertical, Ellipsis, Pencil, Trash2, FileText, Plus, Upload, Image as ImageIcon } from '@lucide/svelte';
	import { assets } from '../../../api/assets';
	import type { ImageValue } from '../../../types/asset';
	import { toast } from 'svelte-sonner';
	import AssetBrowserModal from '../AssetBrowserModal.svelte';

	interface Props {
		field: ArrayFieldType;
		value: any;
		onUpdate: (value: any) => void;
		onOpenReference?: (documentId: string, documentType: string) => void;
		readonly?: boolean;
		organizationId?: string;
	}

	let {
		field,
		value,
		onUpdate,
		onOpenReference,
		readonly = false,
		organizationId
	}: Props = $props();

	const schemas = getSchemaContext();

	function getSchemaForType(typeName: string): SchemaType | null {
		const inlineDef = field.of?.find(
			(ref) => (ref.name && ref.name === typeName) || ref.type === typeName
		);

		if (inlineDef && inlineDef.fields) {
			return {
				type: 'object',
				name: inlineDef.name || typeName,
				title: inlineDef.title || typeName,
				fields: inlineDef.fields
			};
		}

		return getSchemaByName(schemas, typeName);
	}

	const isPrimitiveArray = $derived(
		field.of &&
			field.of.length > 0 &&
			field.of[0]?.type &&
			!field.of[0].fields &&
			!getSchemaByName(schemas, field.of[0].type)
	);
	const primitiveType = $derived(isPrimitiveArray ? field.of?.[0]?.type : null);
	const availableTypes = $derived(getArrayTypes(schemas, field));

	// Modal state
	let modalOpen = $state(false);
	let editingIndex = $state<number | null>(null);
	let editingType = $state<string | null>(null);
	let editingSchema = $state<SchemaType | null>(null);
	let editingValue = $state<Record<string, any>>({});

	// Image modal state
	let imageModalOpen = $state(false);
	let imageModalValue = $state<any>(null);
	let imageModalIndex = $state<number | null>(null);
	function handleOpenImageModal(index: number) {
		imageModalIndex = index;
		imageModalValue = arrayValue[index];
		imageModalOpen = true;
	}

	// Text editing modal state
	let textModalOpen = $state(false);
	let textModalIndex = $state<number | null>(null);
	let textModalValue = $state('');

	function handleOpenTextModal(index: number) {
		textModalIndex = index;
		textModalValue = arrayValue[index] ?? '';
		textModalOpen = true;
	}

	function handleTextModalSave() {
		if (textModalIndex !== null) {
			handleUpdatePrimitive(textModalIndex, textModalValue);
		}
		textModalOpen = false;
		textModalIndex = null;
	}

	function handleTextModalClose() {
		textModalOpen = false;
		textModalIndex = null;
	}

	const arrayValue = $derived(Array.isArray(value) ? value : []);

	function generateKey(): string {
		return Math.random().toString(36).substring(2, 9);
	}

	// Keyed items for object arrays
	const keyedItems = $derived(arrayValue);

	// Ensure all object items have a stable _key for DnD
	$effect(() => {
		if (isPrimitiveArray) return;
		const items = arrayValue;
		let needsUpdate = false;
		const keyed = items.map((item: any) => {
			if (item && typeof item === 'object' && !item._key) {
				needsUpdate = true;
				return { ...item, _key: generateKey() };
			}
			return item;
		});
		if (needsUpdate) {
			onUpdate(keyed);
		}
	});

	// Drag-and-drop handler for object arrays (uses _key)
	function handleDragEnd(event: any) {
		const { source, target } = event.operation;
		if (!source || !target) return;

		const fromIndex = keyedItems.findIndex((item: any) => item._key === source.id);
		const toIndex = keyedItems.findIndex((item: any) => item._key === target.id);

		if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

		const reordered = arrayMove([...keyedItems], fromIndex, toIndex);
		onUpdate(reordered);
	}

	// Drag-and-drop handler for primitive arrays (uses index-based IDs)
	// Primitive sortable IDs are "prim-{index}", so we parse the index back out
	function handlePrimitiveDragEnd(event: any) {
		const { source, target } = event.operation;
		if (!source || !target) return;

		const fromIndex = parseInt(String(source.id).replace('prim-', ''), 10);
		const toIndex = parseInt(String(target.id).replace('prim-', ''), 10);

		if (isNaN(fromIndex) || isNaN(toIndex) || fromIndex === toIndex) return;

		const reordered = arrayMove([...arrayValue], fromIndex, toIndex);
		onUpdate(reordered);
	}

	// Primitive array functions
	function handleAddPrimitive() {
		if (readonly) return;

		if (primitiveType === 'image') {
			imageModalIndex = null;
			imageModalValue = null;
			imageModalOpen = true;
			return;
		}

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
		imageModalIndex = null;
	}

	function handleImageUpload(newValue: any) {
		if (imageModalIndex !== null) {
			// Editing existing image — update in place (even if null/cleared)
			const newArray = [...arrayValue];
			newArray[imageModalIndex] = newValue;
			imageModalValue = newValue;
			onUpdate(newArray);
		} else if (newValue) {
			// Adding new image
			const newArray = [...arrayValue, newValue];
			onUpdate(newArray);
			// Close modal after adding new image
			imageModalOpen = false;
			imageModalValue = null;
			imageModalIndex = null;
		}
	}

	// Multi-image upload for image arrays
	let multiFileInputRef: HTMLInputElement;
	let isMultiUploading = $state(false);
	let uploadProgress = $state({ current: 0, total: 0 });
	let showArrayAssetBrowser = $state(false);

	// IDs of assets already in the array (for showing ticks in the browser)
	const existingAssetIds = $derived(
		primitiveType === 'image'
			? new Set(arrayValue.filter((v: any) => v?.asset?._ref).map((v: any) => v.asset._ref))
			: new Set<string>()
	);

	function openMultiFileDialog() {
		if (readonly) return;
		multiFileInputRef?.click();
	}

	async function uploadImageFile(file: File): Promise<ImageValue | null> {
		try {
			const formData = new FormData();
			formData.append('file', file);
			if (organizationId) formData.append('organizationId', organizationId);

			const result = await assets.upload(formData);
			if (!result.success) throw new Error(result.error || 'Upload failed');

			return {
				_type: 'image',
				asset: { _type: 'reference', _ref: result.data!.id }
			};
		} catch (error) {
			toast.error(`Failed to upload ${file.name}`);
			return null;
		}
	}

	async function handleMultiFileSelect(files: FileList | null) {
		if (readonly || !files || files.length === 0) return;

		isMultiUploading = true;
		uploadProgress = { current: 0, total: files.length };

		const newImages: ImageValue[] = [];
		for (const file of Array.from(files)) {
			uploadProgress.current++;
			const imageValue = await uploadImageFile(file);
			if (imageValue) newImages.push(imageValue);
		}

		if (newImages.length > 0) {
			onUpdate([...arrayValue, ...newImages]);
			toast.success(`Uploaded ${newImages.length} image${newImages.length > 1 ? 's' : ''}`);
		}

		isMultiUploading = false;
		uploadProgress = { current: 0, total: 0 };
		// Reset file input so same files can be re-selected
		if (multiFileInputRef) multiFileInputRef.value = '';
	}

	function handleArrayAssetSelectMultiple(selectedAssets: any[]) {
		const selectedRefIds = new Set(selectedAssets.map((a: any) => a.id));

		// Keep existing items that are still selected (preserves order & extra data like alt)
		const kept = arrayValue.filter((item: any) => {
			const ref = item?.asset?._ref;
			return ref && selectedRefIds.has(ref);
		});
		const keptIds = new Set(kept.map((item: any) => item.asset._ref));

		// Add newly selected items
		const added = selectedAssets
			.filter((asset: any) => !keptIds.has(asset.id))
			.map((asset: any) => ({
				_type: 'image' as const,
				asset: { _type: 'reference' as const, _ref: asset.id }
			}));

		onUpdate([...kept, ...added]);
	}

	// Object array functions
	function handleTypeSelected(selectedType: string) {
		if (readonly || !selectedType) return;

		const schema = getSchemaForType(selectedType);
		if (!schema) return;

		const newItem: Record<string, any> = { _type: selectedType, _key: generateKey() };

		if (schema.fields) {
			schema.fields.forEach((field) => {
				if ('initialValue' in field && field.initialValue !== undefined) {
					if (typeof field.initialValue !== 'function') {
						newItem[field.name] = field.initialValue;
					} else {
						newItem[field.name] = getDefaultValueForFieldType(field.type);
					}
				} else {
					newItem[field.name] = getDefaultValueForFieldType(field.type);
				}
			});
		}

		editingIndex = arrayValue.length;
		editingType = selectedType;
		editingSchema = schema;
		editingValue = newItem;
		modalOpen = true;
	}

	function handleEditItem(index: number) {
		const item = keyedItems[index];
		if (!item._type) return;

		const schema = getSchemaForType(item._type);
		if (!schema) return;

		editingIndex = index;
		editingType = item._type;
		editingSchema = schema;
		editingValue = item;
		modalOpen = true;
	}

	function handleRemoveItem(index: number) {
		if (readonly) return;
		const newArray = keyedItems.filter((_: any, i: number) => i !== index);
		onUpdate(newArray);
	}

	function handleModalSave(editedData: Record<string, any>) {
		if (editingIndex === null || !editingType) return;

		const itemData = { ...editedData, _type: editingType };
		// Preserve _key if editing existing item
		if (editingValue._key) {
			itemData._key = editingValue._key;
		} else {
			itemData._key = generateKey();
		}

		const newArray = [...keyedItems];

		if (editingIndex >= newArray.length) {
			newArray.push(itemData);
		} else {
			newArray[editingIndex] = itemData;
		}

		onUpdate(newArray);

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

	function getItemTitle(item: any): string {
		if (!item._type) return 'Unknown Item';

		const schema = getSchemaForType(item._type);
		if (!schema) return item._type;

		const titleField = item.title || item.heading || item.name || item.label;
		if (titleField && typeof titleField === 'string' && titleField.trim()) {
			return titleField;
		}

		return schema.title || item._type;
	}

	function getItemIcon(item: any): any {
		if (!item._type) return null;
		const schema = getSchemaByName(schemas, item._type);
		return schema?.icon || null;
	}
</script>

{#if isPrimitiveArray}
	<!-- Primitive array UI with DnD -->
	{#if arrayValue.length === 0}
		<div
			class="border-border/50 bg-muted/30 flex items-center justify-center rounded border border-dashed p-6"
		>
			<p class="text-muted-foreground text-sm">No items added yet</p>
		</div>
	{:else if primitiveType === 'image'}
		<DragDropProvider onDragEnd={handlePrimitiveDragEnd}>
			<div class="space-y-1">
				{#each arrayValue as item, index (`prim-${index}`)}
					{@const sortable = createSortable({ id: `prim-${index}`, index: () => index, disabled: readonly })}
					<div
						{@attach sortable.attach}
						class="border-border/50 bg-background hover:bg-muted/50 flex h-16 items-center gap-1 rounded border px-1 transition-colors"
						class:opacity-50={sortable.isDragging}
					>
						{#if !readonly}
							<button
								{@attach sortable.attachHandle}
								class="text-muted-foreground hover:text-foreground flex h-8 w-6 cursor-grab items-center justify-center active:cursor-grabbing"
							>
								<GripVertical class="h-4 w-4" />
							</button>
						{/if}

						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="min-w-0 flex-1 cursor-pointer text-left"
							onclick={() => handleOpenImageModal(index)}
						>
							<ImageField
								field={{
									...field.of?.[0],
									name: `image-${index}`,
									type: 'image',
									title: `Image ${index + 1}`
								}}
								value={item}
								onUpdate={() => {}}
								{readonly}
								arrayItem={true}
								{organizationId}
							/>
						</div>

						{#if !readonly}
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<button
											{...props}
											class="text-muted-foreground hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors hover:bg-transparent"
										>
											<Ellipsis class="h-4 w-4" />
										</button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									<DropdownMenu.Item onclick={() => handleOpenImageModal(index)}>
										<Pencil class="mr-2 h-4 w-4" />
										Edit
									</DropdownMenu.Item>
									<DropdownMenu.Separator />
									<DropdownMenu.Item
										class="text-destructive focus:text-destructive"
										onclick={() => handleRemoveItem(index)}
									>
										<Trash2 class="mr-2 h-4 w-4" />
										Remove
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						{/if}
					</div>
				{/each}
			</div>
		</DragDropProvider>
	{:else}
		<DragDropProvider onDragEnd={handlePrimitiveDragEnd}>
			<div class="space-y-1">
				{#each arrayValue as item, index (`prim-${index}`)}
					{@const sortable = createSortable({ id: `prim-${index}`, index: () => index, disabled: readonly })}
					<div
						{@attach sortable.attach}
						class="border-border/50 bg-background hover:bg-muted/50 flex h-10 items-center gap-1 rounded border px-1 transition-colors"
						class:opacity-50={sortable.isDragging}
					>
						{#if !readonly}
							<button
								{@attach sortable.attachHandle}
								class="text-muted-foreground hover:text-foreground flex h-8 w-6 cursor-grab items-center justify-center active:cursor-grabbing"
							>
								<GripVertical class="h-4 w-4" />
							</button>
						{/if}

						<div class="min-w-0 flex-1">
							{#if primitiveType === 'boolean'}
								<div class="flex items-center gap-2 px-1">
									<Checkbox
										checked={item}
										onCheckedChange={(checked) => handleUpdatePrimitive(index, checked)}
										disabled={readonly}
									/>
									<span class="text-sm">{item ? 'True' : 'False'}</span>
								</div>
							{:else if primitiveType === 'number'}
								<Input
									type="number"
									value={item}
									oninput={(e) =>
										handleUpdatePrimitive(index, parseFloat(e.currentTarget.value) || 0)}
									{readonly}
									class="h-8 w-full border-none bg-transparent shadow-none focus-visible:ring-0"
									placeholder="Enter number..."
								/>
							{:else}
								<Input
									value={item}
									oninput={(e) => handleUpdatePrimitive(index, e.currentTarget.value)}
									{readonly}
									class="h-8 w-full border-none bg-transparent shadow-none focus-visible:ring-0"
									placeholder="Enter value..."
								/>
							{/if}
						</div>

						{#if !readonly}
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<button
											{...props}
											class="text-muted-foreground hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors hover:bg-transparent"
										>
											<Ellipsis class="h-4 w-4" />
										</button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									{#if primitiveType === 'text'}
										<DropdownMenu.Item onclick={() => handleOpenTextModal(index)}>
											<Pencil class="mr-2 h-4 w-4" />
											Edit
										</DropdownMenu.Item>
										<DropdownMenu.Separator />
									{/if}
									<DropdownMenu.Item
										class="text-destructive focus:text-destructive"
										onclick={() => handleRemoveItem(index)}
									>
										<Trash2 class="mr-2 h-4 w-4" />
										Remove
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						{/if}
					</div>
				{/each}
			</div>
		</DragDropProvider>
	{/if}

	{#if !readonly}
		{#if primitiveType === 'image'}
			<!-- Multi-upload actions for image arrays -->
			<input
				bind:this={multiFileInputRef}
				type="file"
				accept="image/*"
				multiple
				style="display: none"
				onchange={(e) => handleMultiFileSelect(e.currentTarget.files)}
			/>
			{#if isMultiUploading}
				<div class="border-border/50 bg-muted/30 flex h-10 w-full items-center justify-center gap-2 rounded border border-dashed text-sm">
					<div class="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
					<span class="text-muted-foreground">Uploading {uploadProgress.current} of {uploadProgress.total}...</span>
				</div>
			{:else}
				<div class="flex gap-2">
					<button
						class="border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 flex h-10 flex-1 items-center justify-center gap-2 rounded border border-dashed text-sm transition-colors"
						onclick={openMultiFileDialog}
					>
						<Upload class="h-4 w-4" />
						Upload images...
					</button>
					<button
						class="border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 flex h-10 flex-1 items-center justify-center gap-2 rounded border border-dashed text-sm transition-colors"
						onclick={() => { showArrayAssetBrowser = true; }}
					>
						<ImageIcon class="h-4 w-4" />
						Browse media...
					</button>
				</div>
			{/if}
		{:else}
			<button
				class="border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 flex h-10 w-full items-center justify-center gap-2 rounded border border-dashed text-sm transition-colors"
				onclick={handleAddPrimitive}
			>
				<Plus class="h-4 w-4" />
				Add item...
			</button>
		{/if}
	{/if}
{:else}
	<!-- Object array UI — Sanity-style compact rows with DnD -->
	{#if keyedItems.length === 0}
		<div
			class="border-border/50 bg-muted/30 flex items-center justify-center rounded border border-dashed p-6"
		>
			<p class="text-muted-foreground text-sm">No items added yet</p>
		</div>
	{:else}
		<DragDropProvider onDragEnd={handleDragEnd}>
			<div class="space-y-1">
				{#each keyedItems as item, index (item._key)}
					{@const sortable = createSortable({ id: item._key, index: () => index, disabled: readonly })}
					<div
						{@attach sortable.attach}
						class="border-border/50 bg-background hover:bg-muted/50 flex h-10 items-center gap-1 rounded border px-1 transition-colors"
						class:opacity-50={sortable.isDragging}
					>
						<!-- Drag handle -->
						{#if !readonly}
							<button
								{@attach sortable.attachHandle}
								class="text-muted-foreground hover:text-foreground flex h-8 w-6 cursor-grab items-center justify-center active:cursor-grabbing"
							>
								<GripVertical class="h-4 w-4" />
							</button>
						{/if}

						<!-- Type icon -->
						<div class="text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center">
							{#if getItemIcon(item)}
								{@const Icon = getItemIcon(item)}
								<Icon class="h-4 w-4" />
							{:else}
								<FileText class="h-4 w-4" />
							{/if}
						</div>

						<!-- Title (clickable to edit) -->
						<button
							class="flex-1 truncate text-left text-sm"
							onclick={() => handleEditItem(index)}
						>
							{getItemTitle(item)}
						</button>

						<!-- Context menu -->
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<button
										{...props}
										class="text-muted-foreground hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded transition-colors hover:bg-transparent"
									>
										<Ellipsis class="h-4 w-4" />
									</button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end">
								<DropdownMenu.Item onclick={() => handleEditItem(index)}>
									<Pencil class="mr-2 h-4 w-4" />
									{readonly ? 'View' : 'Edit'}
								</DropdownMenu.Item>
								{#if !readonly}
									<DropdownMenu.Separator />
									<DropdownMenu.Item
										class="text-destructive focus:text-destructive"
										onclick={() => handleRemoveItem(index)}
									>
										<Trash2 class="mr-2 h-4 w-4" />
										Remove
									</DropdownMenu.Item>
								{/if}
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				{/each}
			</div>
		</DragDropProvider>
	{/if}

	<!-- Add item button -->
	{#if !readonly}
		{#if availableTypes.length === 1}
			<button
				class="border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 flex h-10 w-full items-center justify-center gap-2 rounded border border-dashed text-sm transition-colors"
				onclick={() => handleTypeSelected(availableTypes[0].name)}
			>
				<Plus class="h-4 w-4" />
				Add item...
			</button>
		{:else}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<button
							{...props}
							class="border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded border border-dashed text-sm transition-colors"
						>
							<Plus class="h-4 w-4" />
							Add item...
						</button>
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
		{/if}
	{/if}
{/if}

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
		{organizationId}
	/>
{/if}

<!-- Image upload modal -->
{#if imageModalOpen}
	<div
		class="bg-background/80 backdrop-blur-xs fixed bottom-0 left-0 right-0 top-12 z-40 flex items-center justify-center p-6 sm:absolute sm:top-0 sm:p-4"
		onclick={(e) => {
			if (e.target === e.currentTarget) handleImageModalClose();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') handleImageModalClose();
		}}
		role="button"
		tabindex="-1"
	>
		<Card.Root class="flex max-h-[85vh] w-full max-w-2xl flex-col shadow-lg">
			<Card.Header class="border-b">
				<div class="flex items-center justify-between">
					<div>
						<Card.Title>{imageModalIndex !== null ? 'Edit Image' : `${field.title} - Add Image`}</Card.Title>
						<Card.Description>{imageModalIndex !== null ? 'Replace or remove this image' : 'Upload a new image to add to the array'}</Card.Description>
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

			<Card.Content class="flex-1 overflow-visible">
				<ImageField
					field={{
						...field.of?.[0],
						name: 'image',
						type: 'image',
						title: 'Image'
					}}
					value={imageModalValue}
					onUpdate={handleImageUpload}
					{organizationId}
				/>
			</Card.Content>
		</Card.Root>
	</div>
{/if}

<!-- Text editing modal -->
{#if textModalOpen}
	<div
		class="bg-background/80 backdrop-blur-xs fixed bottom-0 left-0 right-0 top-12 z-[100] flex items-center justify-center p-6 sm:absolute sm:top-0 sm:p-4"
		onclick={(e) => {
			if (e.target === e.currentTarget) handleTextModalClose();
		}}
		onkeydown={(e) => {
			if (e.key === 'Escape') handleTextModalClose();
		}}
		role="button"
		tabindex="-1"
	>
		<Card.Root class="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden shadow-lg">
			<Card.Header class="border-b">
				<div class="flex items-center justify-between">
					<Card.Title>Edit Text</Card.Title>
					<Button variant="ghost" size="icon" onclick={handleTextModalClose}>
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

			<Card.Content class="pt-4">
				<Textarea
					value={textModalValue}
					oninput={(e) => textModalValue = e.currentTarget.value}
					class="w-full"
					rows={6}
					placeholder="Enter text..."
				/>
			</Card.Content>

			<Card.Footer class="flex justify-end gap-2 border-t">
				<Button variant="outline" onclick={handleTextModalClose}>Cancel</Button>
				<Button onclick={handleTextModalSave}>Save</Button>
			</Card.Footer>
		</Card.Root>
	</div>
{/if}

<!-- Asset Browser Modal for image arrays (multi-select) -->
<AssetBrowserModal
	bind:open={showArrayAssetBrowser}
	onOpenChange={(v) => (showArrayAssetBrowser = v)}
	assetTypeFilter="image"
	multiSelect
	onSelectMultiple={handleArrayAssetSelectMultiple}
	{existingAssetIds}
/>
