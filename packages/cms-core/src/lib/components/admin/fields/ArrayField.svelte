<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Textarea } from '@aphexcms/ui/shadcn/textarea';
	import { Checkbox } from '@aphexcms/ui/shadcn/checkbox';
	import * as DropdownMenu from '@aphexcms/ui/shadcn/dropdown-menu';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import type { ArrayField as ArrayFieldType, Field, SchemaType } from '../../../types/schemas';
	import { getArrayTypes, getSchemaByName } from '../../../schema-utils/utils';
	import { getSchemaContext } from '../../../schema-context.svelte';
	import ObjectModal from '../ObjectModal.svelte';
	import ImageField from './ImageField.svelte';
	import ReferenceField from './ReferenceField.svelte';
	import FieldInput from './FieldInput.svelte';
	import { getDefaultValueForFieldType } from '../../../utils/field-defaults';
	import { DragDropProvider } from '@dnd-kit/svelte';
	import { createSortable, isSortable } from '@dnd-kit/svelte/sortable';
	import { arrayMove } from '@dnd-kit/helpers';
	import {
		GripVertical,
		Ellipsis,
		Pencil,
		Trash2,
		FileText,
		Plus,
		Upload,
		Image as ImageIcon
	} from '@lucide/svelte';
	import { assets } from '../../../api/assets';
	import type { ImageValue } from '../../../types/asset';
	import { toast } from 'svelte-sonner';
	import AssetBrowserModal from '../AssetBrowserModal.svelte';
	import { resolvePreviewTitle, resolvePreviewSubtitle } from '../../../utils/preview';
	import { documents } from '../../../api/documents';
	import { SvelteMap } from 'svelte/reactivity';
	import { getDocumentVersion } from '../../../document-refresh.svelte';

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
				fields: inlineDef.fields,
				icon: inlineDef.icon,
				preview: inlineDef.preview
			};
		}

		return getSchemaByName(schemas, typeName);
	}

	const isBlockArray = $derived(field.of?.some((ref) => ref.type === 'block') ?? false);
	// Rich text (TipTap) is by far the largest field dependency. Load it only when
	// the array actually holds block content, so document editors without a
	// rich-text field — and every admin page that never renders one — stay off
	// that chunk. The import is cached, so a stable isBlockArray never refetches.
	const richtextModule = $derived(isBlockArray ? import('./richtext/RichtextField.svelte') : null);
	const isGridLayout = $derived(field.options?.layout === 'grid');
	const isReferenceArray = $derived(
		field.of && field.of.length > 0 && field.of[0]?.type === 'reference'
	);
	const isPrimitiveArray = $derived(
		!isReferenceArray &&
			field.of &&
			field.of.length > 0 &&
			field.of[0]?.type &&
			!field.of[0].fields &&
			!getSchemaByName(schemas, field.of[0].type)
	);
	const primitiveType = $derived(isPrimitiveArray ? field.of?.[0]?.type : null);
	const availableTypes = $derived(getArrayTypes(schemas, field));

	// The item's field spec, used to render each primitive item through the shared
	// FieldInput resolver (so a rich type or a plugin `input` widget works per item).
	const primitiveItemField = $derived({
		name: `${field.name}-item`,
		title: '',
		...(field.of?.[0] ?? { type: 'string' })
	} as Field);
	// Route through FieldInput for rich types (color/url/slug/date…) or any custom
	// `input`; keep the compact inline inputs for plain string/number/boolean.
	const COMPACT_TYPES = ['string', 'number', 'boolean', 'text'];
	const useResolvedItemInput = $derived(
		!!field.of?.[0]?.input || (!!primitiveType && !COMPACT_TYPES.includes(primitiveType))
	);

	// Synthetic ReferenceField definition reused for every row in an
	// array-of-references. We forward the array's first `of[]` entry's `to` so
	// the row picker honors the schema-author's allowed target types.
	const referenceFieldShape = $derived(
		isReferenceArray
			? {
					name: field.name,
					type: 'reference' as const,
					title: field.title,
					to: (field.of?.[0] as any)?.to ?? []
				}
			: null
	);

	// Batched hydration cache for reference rows. Without this, each row's
	// ReferenceField fires its own getById on mount → N round-trips for an
	// array of N refs. Instead we fetch all populated refs in a single call
	// and hand each row its preloaded doc. The cache invalidates whenever
	// any row's referenced doc bumps its document-refresh version.
	const referenceCache = new SvelteMap<string, any>();
	$effect(() => {
		if (!isReferenceArray) return;
		const ids = (Array.isArray(value) ? value : [])
			.map((item: any) => item?._ref)
			.filter((id: any): id is string => typeof id === 'string' && id.length > 0);
		if (ids.length === 0) return;
		// Subscribe to each id's version so external saves trigger a refetch.
		for (const id of ids) getDocumentVersion(id);
		(async () => {
			try {
				const res = await documents.getMany(ids);
				if (res.success && res.data) {
					for (const doc of res.data as any[]) {
						if (doc?.id) referenceCache.set(doc.id, doc);
					}
				}
			} catch {
				// Per-row ReferenceField will fall back to its own fetch on miss.
			}
		})();
	});

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

	// Stable key cache for object items that arrive without _key
	const keyCache = new WeakMap<object, string>();

	// Keyed items — ensures every object item has a _key before rendering
	const keyedItems = $derived.by(() => {
		if (isPrimitiveArray) return arrayValue;
		return arrayValue.map((item: any) => {
			if (item && typeof item === 'object' && !item._key) {
				let cachedKey = keyCache.get(item);
				if (!cachedKey) {
					cachedKey = generateKey();
					keyCache.set(item, cachedKey);
				}
				return { ...item, _key: cachedKey };
			}
			return item;
		});
	});

	// Persist generated keys back to parent state (skip in readonly mode to avoid infinite loops)
	$effect(() => {
		if (isPrimitiveArray || readonly) return;
		const hasUnkeyed = arrayValue.some(
			(item: any) => item && typeof item === 'object' && !item._key
		);
		if (hasUnkeyed) {
			onUpdate(keyedItems);
		}
	});

	// Key to force DragDropProvider remount after reorder, clearing stale transforms
	let dndKey = $state(0);

	// Drag-and-drop handler for object arrays
	function handleDragEnd(event: any) {
		const { source } = event.operation;
		if (!source || !isSortable(source)) return;

		const fromIndex = (source as any).initialIndex as number;
		const toIndex = source.index;

		if (fromIndex === toIndex) return;

		const reordered = arrayMove([...keyedItems], fromIndex, toIndex);
		onUpdate(reordered);
		dndKey++;
	}

	// Drag-and-drop handler for primitive arrays
	function handlePrimitiveDragEnd(event: any) {
		const { source } = event.operation;
		if (!source || !isSortable(source)) return;

		const fromIndex = (source as any).initialIndex as number;
		const toIndex = source.index;

		if (fromIndex === toIndex) return;

		const reordered = arrayMove([...arrayValue], fromIndex, toIndex);
		onUpdate(reordered);
		dndKey++;
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
	let multiFileInputRef = $state<HTMLInputElement>(null!);
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
				_key: generateKey(),
				asset: { _type: 'reference', _ref: result.data!.id }
			};
		} catch {
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
				_key: generateKey(),
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

		// Add to array immediately so document auto-save captures it
		const newArray = [...keyedItems, newItem];
		onUpdate(newArray);

		editingIndex = newArray.length - 1;
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

	// Reference array — append an empty reference row. The row renders the
	// ReferenceField empty state (search picker), so the user picks the target
	// document inline without an extra modal step.
	function handleAddReference() {
		if (readonly) return;
		const newItem = { _type: 'reference', _key: generateKey(), _ref: null };
		onUpdate([...keyedItems, newItem]);
	}

	function handleUpdateReference(
		index: number,
		newRef: { _type: 'reference'; _ref: string; _key?: string } | null
	) {
		if (readonly) return;
		const newArray = [...keyedItems];
		// Preserve the row's _key (stable across drag/drop) and only swap the _ref.
		newArray[index] = {
			...newArray[index],
			_ref: newRef?._ref ?? null
		};
		onUpdate(newArray);
	}

	// Write-through: propagate every field change from the modal to the array immediately
	function handleModalUpdate(updatedData: Record<string, any>) {
		if (editingIndex === null || !editingType) return;

		const itemData: Record<string, any> = { ...updatedData, _type: editingType };
		if (editingValue._key) {
			itemData._key = editingValue._key;
		} else {
			itemData._key = generateKey();
		}

		editingValue = itemData;

		const newArray = [...keyedItems];
		newArray[editingIndex] = itemData;
		onUpdate(newArray);
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
		return resolvePreviewTitle(item, schema, item._type);
	}

	function getItemSubtitle(item: any): string | null {
		if (!item._type) return null;
		const schema = getSchemaForType(item._type);
		return resolvePreviewSubtitle(item, schema);
	}

	function getItemIcon(item: any): any {
		if (!item._type) return null;
		const schema = getSchemaForType(item._type);
		return schema?.icon || null;
	}
</script>

{#if isBlockArray}
	{#if richtextModule}
		{#await richtextModule then { default: RichtextField }}
			<RichtextField {field} {value} {onUpdate} {readonly} {onOpenReference} {organizationId} />
		{/await}
	{/if}
{:else if isReferenceArray && referenceFieldShape}
	<!-- Reference array — each row reuses ReferenceField. Drag handle on the
	     left, ReferenceField fills the row, an X button on empty rows lets the
	     user discard a never-picked row (populated rows use ReferenceField's
	     own context menu, which we override via onRemove to drop the row). -->
	{#if keyedItems.length > 0}
		{#key dndKey}
			<DragDropProvider onDragEnd={handleDragEnd}>
				<div class="space-y-1">
					{#each keyedItems as item, index (item._key ?? `__row-${index}`)}
						{@const sortable = createSortable({ id: item._key, index, disabled: readonly })}
						<div
							{@attach sortable.attach}
							class="flex items-center gap-1"
							class:opacity-50={sortable.isDragging}
						>
							{#if !readonly}
								<button
									{@attach sortable.attachHandle}
									class="text-muted-foreground hover:text-foreground flex h-9 w-7 shrink-0 cursor-grab items-center justify-center active:cursor-grabbing"
								>
									<GripVertical class="h-4 w-4" />
								</button>
							{/if}
							<div class="min-w-0 flex-1">
								<ReferenceField
									field={referenceFieldShape}
									value={item._ref ? { _type: 'reference', _ref: item._ref } : null}
									onUpdate={(newRef) => handleUpdateReference(index, newRef)}
									{onOpenReference}
									{readonly}
									onRemove={() => handleRemoveItem(index)}
									preloadedDoc={item._ref ? referenceCache.get(item._ref) : undefined}
								/>
							</div>
							{#if !readonly && !item._ref}
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props })}
											<button
												{...props}
												class="text-muted-foreground hover:text-foreground flex h-9 w-7 shrink-0 items-center justify-center rounded transition-colors"
												aria-label="Row options"
											>
												<Ellipsis class="h-4 w-4" />
											</button>
										{/snippet}
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
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
		{/key}
	{/if}
	{#if !readonly}
		<button
			class="border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 mt-1 flex h-10 w-full items-center justify-center gap-2 rounded border border-dashed text-sm transition-colors"
			onclick={handleAddReference}
		>
			<Plus class="h-4 w-4" />
			Add reference...
		</button>
	{/if}
{:else if isPrimitiveArray}
	<!-- Primitive array UI with DnD -->
	{#if arrayValue.length === 0}
		<div
			class="border-border/50 bg-muted/30 flex items-center justify-center rounded border border-dashed p-6"
		>
			<p class="text-muted-foreground text-sm">No items added yet</p>
		</div>
	{:else if primitiveType === 'image'}
		{#key dndKey}
			<DragDropProvider onDragEnd={handlePrimitiveDragEnd}>
				{#if isGridLayout}
					<!-- Grid layout for images -->
					{#if arrayValue.length === 0}
						<div
							class="border-border/50 flex h-32 items-center justify-center rounded-md border border-dashed"
						>
							<div class="text-center">
								<ImageIcon class="text-muted-foreground mx-auto h-8 w-8" />
								<p class="text-muted-foreground mt-1 text-xs">No images yet</p>
							</div>
						</div>
					{/if}
					<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
						{#each arrayValue as item, index (`prim-${index}`)}
							{@const sortable = createSortable({ id: `prim-${index}`, index, disabled: readonly })}
							<div
								{@attach sortable.attach}
								class="border-border/50 bg-background group relative aspect-square overflow-hidden rounded-md border"
								class:opacity-50={sortable.isDragging}
							>
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="h-full w-full cursor-pointer"
									onclick={() => handleOpenImageModal(index)}
								>
									{#if item?.asset?._ref}
										{#await assets.getById(item.asset._ref)}
											<div class="bg-muted flex h-full w-full items-center justify-center">
												<div
													class="border-primary h-4 w-4 animate-spin rounded-full border-b-2"
												></div>
											</div>
										{:then result}
											{#if result.success && result.data?.url}
												<img
													src={result.data.url}
													alt={item?.alt || `Image ${index + 1}`}
													class="h-full w-full object-cover"
													loading="lazy"
												/>
											{:else}
												<div class="bg-muted flex h-full w-full items-center justify-center">
													<ImageIcon class="text-muted-foreground h-8 w-8" />
												</div>
											{/if}
										{:catch}
											<div class="bg-muted flex h-full w-full items-center justify-center">
												<ImageIcon class="text-muted-foreground h-8 w-8" />
											</div>
										{/await}
									{:else}
										<div class="bg-muted flex h-full w-full items-center justify-center">
											<ImageIcon class="text-muted-foreground h-8 w-8" />
										</div>
									{/if}
								</div>

								<!-- Overlay controls -->
								{#if !readonly}
									<div
										class="absolute top-1 left-1 opacity-0 transition-opacity group-hover:opacity-100"
									>
										<button
											{@attach sortable.attachHandle}
											class="bg-background/80 cursor-grab rounded p-1 active:cursor-grabbing"
										>
											<GripVertical class="h-3.5 w-3.5" />
										</button>
									</div>
									<div
										class="absolute right-1 bottom-1 opacity-0 transition-opacity group-hover:opacity-100"
									>
										<DropdownMenu.Root>
											<DropdownMenu.Trigger>
												{#snippet child({ props })}
													<button {...props} class="bg-background/80 rounded p-1">
														<Ellipsis class="h-3.5 w-3.5" />
													</button>
												{/snippet}
											</DropdownMenu.Trigger>
											<DropdownMenu.Content align="end">
												<DropdownMenu.Item onclick={() => handleOpenImageModal(index)}>
													<Pencil class="mr-2 h-4 w-4" /> Edit
												</DropdownMenu.Item>
												<DropdownMenu.Separator />
												<DropdownMenu.Item
													class="text-destructive focus:text-destructive"
													onclick={() => handleRemoveItem(index)}
												>
													<Trash2 class="mr-2 h-4 w-4" /> Remove
												</DropdownMenu.Item>
											</DropdownMenu.Content>
										</DropdownMenu.Root>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<!-- Default list layout for images -->
					<div class="space-y-1">
						{#each arrayValue as item, index (`prim-${index}`)}
							{@const sortable = createSortable({ id: `prim-${index}`, index, disabled: readonly })}
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
				{/if}
			</DragDropProvider>
		{/key}
	{:else}
		{#key dndKey}
			<DragDropProvider onDragEnd={handlePrimitiveDragEnd}>
				<div class="space-y-1">
					{#each arrayValue as item, index (`prim-${index}`)}
						{@const sortable = createSortable({ id: `prim-${index}`, index, disabled: readonly })}
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
								{#if useResolvedItemInput}
									<FieldInput
										field={primitiveItemField}
										value={item}
										onUpdate={(v) => handleUpdatePrimitive(index, v)}
										{readonly}
									/>
								{:else if primitiveType === 'boolean'}
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
		{/key}
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
				<div
					class="border-border/50 bg-muted/30 flex h-10 w-full items-center justify-center gap-2 rounded border border-dashed text-sm"
				>
					<div
						class="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"
					></div>
					<span class="text-muted-foreground"
						>Uploading {uploadProgress.current} of {uploadProgress.total}...</span
					>
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
						onclick={() => {
							showArrayAssetBrowser = true;
						}}
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
		{#key dndKey}
			<DragDropProvider onDragEnd={handleDragEnd}>
				<div class="space-y-1">
					{#each keyedItems as item, index (item._key ?? `__row-${index}`)}
						{@const sortable = createSortable({ id: item._key, index, disabled: readonly })}
						<div
							{@attach sortable.attach}
							class="border-border/50 bg-background hover:bg-muted/50 flex min-h-11 items-center gap-1 rounded border pl-1 transition-colors"
							class:opacity-50={sortable.isDragging}
						>
							<!-- Drag handle -->
							{#if !readonly}
								<button
									{@attach sortable.attachHandle}
									class="text-muted-foreground hover:text-foreground flex h-9 w-7 shrink-0 cursor-grab items-center justify-center active:cursor-grabbing"
								>
									<GripVertical class="h-4 w-4" />
								</button>
							{/if}

							<!-- Title (clickable to edit) — wraps the type icon so the whole
							     row body is a generous click target instead of just the
							     truncated title text. When the schema's preview config
							     supplies a `subtitle` field, render it on a second line. -->
							<button
								class="flex flex-1 cursor-pointer items-center gap-2 self-stretch truncate px-1 py-2 text-left text-sm"
								onclick={() => handleEditItem(index)}
							>
								<span
									class="text-muted-foreground flex h-5 w-5 shrink-0 items-center justify-center"
								>
									{#if getItemIcon(item)}
										{@const Icon = getItemIcon(item)}
										<Icon class="h-4 w-4" />
									{:else}
										<FileText class="h-4 w-4" />
									{/if}
								</span>
								<span class="flex min-w-0 flex-1 flex-col">
									<span class="truncate">{getItemTitle(item)}</span>
									{#if getItemSubtitle(item)}
										<span class="text-muted-foreground truncate text-xs"
											>{getItemSubtitle(item)}</span
										>
									{/if}
								</span>
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
		{/key}
	{/if}

	<!-- Add item button -->
	{#if !readonly}
		{#if availableTypes.length === 1}
			<button
				class="border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 flex h-10 w-full items-center justify-center gap-2 rounded border border-dashed text-sm transition-colors"
				onclick={() => handleTypeSelected(availableTypes[0]!.name)}
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
		onUpdate={handleModalUpdate}
		{onOpenReference}
		{readonly}
		{organizationId}
	/>
{/if}

<!-- Image upload modal -->
{#if imageModalOpen}
	<div
		class="bg-background/80 fixed top-12 right-0 bottom-0 left-0 z-40 flex items-center justify-center p-6 sm:absolute sm:top-0 sm:p-4"
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
						<Card.Title
							>{imageModalIndex !== null ? 'Edit Image' : `${field.title} - Add Image`}</Card.Title
						>
						<Card.Description
							>{imageModalIndex !== null
								? 'Replace or remove this image'
								: 'Upload a new image to add to the array'}</Card.Description
						>
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
		class="bg-background/80 fixed top-12 right-0 bottom-0 left-0 z-[100] flex items-center justify-center p-6 sm:absolute sm:top-0 sm:p-4"
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
					oninput={(e) => (textModalValue = e.currentTarget.value)}
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
