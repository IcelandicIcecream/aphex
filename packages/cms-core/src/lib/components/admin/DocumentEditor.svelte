<script lang="ts">
	import { tick } from 'svelte';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { documents } from '../../api/documents';
	import { ApiError } from '../../api/client';
	import SchemaField from './SchemaField.svelte';
	import { findOrphanedFields, type OrphanedField } from '../../schema-utils/cleanup';
	import type { SchemaType } from 'src/lib/types/schemas.js';
	import { Rule } from '../../field-validation/rule';
	import { hasUnpublishedChanges } from '../../utils/content-hash';
	import { setSchemaContext } from '../../schema-context.svelte';
	import { getDefaultValueForFieldType } from '../../utils/field-defaults';
	import elementEvents from '../../utils/element-events';
	import { cmsLogger } from '../../utils/debug';

	interface Props {
		schemas: SchemaType[];
		documentType: string;
		documentId?: string | null;
		isCreating: boolean;
		onBack: () => void;
		onSaved?: (documentId: string) => void;
		onAutoSaved?: (documentId: string, title: string) => void;
		onDeleted?: () => void;
		onPublished?: (documentId: string) => void;
		onOpenReference?: (documentId: string, documentType: string) => void;
		isReadOnly?: boolean;
	}

	let {
		schemas,
		documentType,
		documentId,
		isCreating,
		onBack,
		onSaved,
		onAutoSaved,
		onDeleted,
		onPublished,
		onOpenReference,
		isReadOnly = false
	}: Props = $props();

	// Set schema context for child components (ArrayField, etc.)
	setSchemaContext(schemas);

	// Schema and document state
	let schema = $state<SchemaType | null>(null);
	let schemaLoading = $state(false);
	let schemaError = $state<string | null>(null);

	// Document data state
	let documentData = $state<Record<string, any>>({});
	let fullDocument = $state<any>(null); // Store full document with publishedHash
	let saving = $state(false);
	let saveError = $state<string | null>(null);
	let lastSaved = $state<Date | null>(null);
	let publishSuccess = $state<Date | null>(null);

	// Menu dropdown state
	let showDropdown = $state(false);

	// Auto-save functionality (every 2 seconds when there are changes)
	let hasUnsavedChanges = $state(false);
	let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
	let hasValidationErrors = $state(false);

	let orphanedFields = $state<OrphanedField[]>([]);
	let showOrphanedFields = $state(false);
	let schemaFields: SchemaField[] = [];

	// Track previous document to detect actual switches (not create→edit transitions)
	let previousDocumentId = $state<string | null | undefined>(undefined);
	let previousDocumentType = $state<string | undefined>(undefined);
	let justCreatedDocument = $state(false); // Flag to skip loadDocumentData after creation

	// Hash-based state tracking
	const hasUnpublishedContent = $derived(
		hasUnpublishedChanges(documentData, fullDocument?._meta?.publishedHash || null)
	);
	const canPublish = $derived(
		hasUnpublishedContent && !saving && documentId && !hasValidationErrors
	);

	// Get preview title based on schema config
	function getPreviewTitle(): string {
		if (!schema?.preview?.select?.title) {
			return documentData.title || `Untitled`;
		}
		return documentData[schema.preview.select.title] || `Untitled`;
	}

	// CRITICAL: Clear state IMMEDIATELY when switching documents to prevent cross-contamination
	$effect(() => {
		// This effect runs first - watching documentId and documentType
		const _docId = documentId;
		const _docType = documentType;

		console.log('hasValidationErrors: ', hasValidationErrors);

		// Detect if we're actually switching documents vs just transitioning from creating→editing
		const isSwitchingDocuments =
			previousDocumentId !== undefined && // Not first render
			previousDocumentType !== undefined &&
			(previousDocumentType !== _docType || // Different document type
				(previousDocumentId !== null && previousDocumentId !== _docId)); // Different document ID (but not create→edit)

		// Only clear state if actually switching documents
		if (isSwitchingDocuments) {
			// Clear all state immediately to prevent old data from being auto-saved
			documentData = {};
			fullDocument = null;
			hasUnsavedChanges = false;
			saveError = null;
			lastSaved = null;
			publishSuccess = null;

			// Cancel pending auto-save
			if (autoSaveTimer) {
				clearTimeout(autoSaveTimer);
				autoSaveTimer = null;
			}

			console.log('🧹 Cleared state for document switch:', _docType, _docId || 'new');
		}

		// Update tracking
		previousDocumentId = _docId;
		previousDocumentType = _docType;
	});

	// Load schema when documentType is available or when switching to create mode
	$effect(() => {
		if (documentType) {
			loadSchema();
		}
	});

	// Load existing document data when editing
	$effect(() => {
		if (!isCreating && documentId) {
			// Skip loading if we just created this document (data is already in memory)
			if (justCreatedDocument) {
				console.log('⏭️  Skipping loadDocumentData - just created document');
				justCreatedDocument = false;
				return;
			}
			loadDocumentData();
		}
	});

	// Initialize new document with field defaults
	$effect(() => {
		if (isCreating && schema) {
			initializeDocument();
		}
	});

	// Check for orphaned fields when document data or schema changes
	$effect(() => {
		if (documentData && schema && Object.keys(documentData).length > 0) {
			const cleanupResult = findOrphanedFields(documentData, schema);
			orphanedFields = cleanupResult.orphanedFields;
			showOrphanedFields = cleanupResult.hasOrphanedFields;
		}
	});

	function loadSchema() {
		schemaLoading = true;
		schemaError = null;

		cmsLogger('[Document Editor]', 'RUNNING LOAD SCHEMA');
		cmsLogger('[Document Editor]', 'SCHEMAS: ', schemas);

		try {
			// Find schema from provided schemas
			const foundSchema = schemas.find((s) => s.name === documentType);

			if (foundSchema) {
				schema = foundSchema;
			} else {
				throw new Error(`Schema type '${documentType}' not found`);
			}
		} catch (err) {
			console.error('Failed to load schema:', err);
			schemaError = err instanceof Error ? err.message : 'Failed to load schema';
		} finally {
			schemaLoading = false;
		}
	}

	async function loadDocumentData() {
		if (!documentId) return;

		console.log('📄 Loading document data for:', documentId);

		try {
			const response = await documents.getById(documentId);

			if (response.success && response.data) {
				// Store full document for hash comparison
				fullDocument = response.data;

				// With LocalAPI, data is flattened at top level (not in draftData)
				// Extract all fields except id and _meta
				const { id, _meta, ...data } = response.data;
				console.log('📄 Full response.data:', response.data);
				console.log('📄 Extracted data (after destructuring):', data);
				console.log('📄 Keys in extracted data:', Object.keys(data));
				console.log('📄 Published hash:', _meta?.publishedHash);

				documentData = { ...data };
				console.log('📄 documentData after assignment:', documentData);
				console.log('📄 Keys in documentData:', Object.keys(documentData));
				hasUnsavedChanges = false; // Just loaded, so no unsaved changes

				// Run validation on loaded document to show any existing errors
				await tick(); // Wait for DOM to update with new data
				schemaFields.forEach((fieldComponent, index) => {
					const field = schema?.fields[index];
					if (fieldComponent && field) {
						fieldComponent.performValidation(documentData[field.name], documentData);
					}
				});
			} else {
				console.log('❌ Failed to load document data:', response.error);
				saveError = response.error || 'Failed to load document';
			}
		} catch (err) {
			console.error('❌ Error loading document data:', err);
			saveError = err instanceof ApiError ? err.message : 'Failed to load document';
		}
	}

	async function initializeDocument() {
		if (!schema) return;

		console.log('🆕 Initializing new document with field defaults');

		// Initialize document data with field defaults
		const initialData: Record<string, any> = {};

		for (const field of schema.fields) {
			if ('initialValue' in field && field.initialValue !== undefined) {
				// Resolve initialValue if it's a function
				if (typeof field.initialValue === 'function') {
					try {
						initialData[field.name] = await field.initialValue();
					} catch (error) {
						console.error(`Failed to resolve initialValue for field "${field.name}":`, error);
						// Fall back to default value for the field type
						initialData[field.name] = getDefaultValueForFieldType(field.type);
					}
				} else {
					// Use literal initialValue
					initialData[field.name] = field.initialValue;
				}
			} else if (field.type === 'boolean') {
				// Boolean fields default to false if no initialValue
				initialData[field.name] = false;
			} else if (field.type === 'array') {
				// Array fields default to empty array
				initialData[field.name] = [];
			} else if (field.type === 'object') {
				// Object fields default to empty object
				initialData[field.name] = {};
			} else if (field.type === 'number') {
				// Number fields default to null (not 0, which is a valid value)
				initialData[field.name] = null;
			} else {
				// String and other fields default to empty string
				initialData[field.name] = '';
			}
		}

		documentData = initialData;
		fullDocument = null;
		hasUnsavedChanges = false;
		lastSaved = null;
		saveError = null;
		console.log('✅ Document initialized with:', initialData);
	}

	// Check if document has meaningful content (not just empty initialized values)
	function hasMeaningfulContent(data: Record<string, any>): boolean {
		return Object.values(data).some((value) => {
			if (typeof value === 'string') return value.trim() !== '';
			if (typeof value === 'boolean') return value !== false; // Assuming false is default
			if (Array.isArray(value)) return value.length > 0;
			if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
			return value !== null && value !== undefined && value !== '';
		});
	}

	// Check if current data differs from last saved draft
	function hasChangesFromSaved(): boolean {
		if (!fullDocument) return true; // No saved version = has changes

		// Extract saved draft data from fullDocument (same as we do in loadDocumentData)
		const { id, _meta, ...savedData } = fullDocument;

		// Compare current documentData with saved data using stable JSON
		const currentJson = JSON.stringify(sortObjectForComparison(documentData));
		const savedJson = JSON.stringify(sortObjectForComparison(savedData));

		return currentJson !== savedJson;
	}

	// Helper to recursively sort object keys for stable comparison
	function sortObjectForComparison(item: any): any {
		if (item === null || typeof item !== 'object') return item;

		if (Array.isArray(item)) {
			return item.map(sortObjectForComparison);
		}

		const sortedKeys = Object.keys(item).sort();
		const sortedObj: any = {};
		for (const key of sortedKeys) {
			sortedObj[key] = sortObjectForComparison(item[key]);
		}
		return sortedObj;
	}

	// Watch for changes to trigger auto-save (debounced)
	$effect(() => {
		const hasContent = hasMeaningfulContent(documentData);
		const hasChanges = hasChangesFromSaved();

		// Only set hasUnsavedChanges if we actually have meaningful data AND it differs from saved
		if (hasContent && hasChanges) {
			hasUnsavedChanges = true;
		} else if (!hasChanges) {
			// If there are no changes from saved, mark as not having unsaved changes
			hasUnsavedChanges = false;
		}

		if (autoSaveTimer) {
			clearTimeout(autoSaveTimer);
		}

		// Debounced auto-save - waits for 800ms pause in typing (like Notion/modern apps)
		// Only auto-save if there's meaningful content, data has changed, and not in read-only mode
		if (hasContent && hasChanges && schema && !isReadOnly) {
			autoSaveTimer = setTimeout(() => {
				console.log('🔄 Auto-saving after typing pause (data changed)...', { documentId });
				saveDocument(true); // auto-save
			}, 1200); // Shorter delay - saves faster but still waits for typing pauses
		} else if (!hasChanges) {
			console.log('⏭️  Skipping auto-save - no changes from saved data');
		}

		return () => {
			if (autoSaveTimer) {
				clearTimeout(autoSaveTimer);
			}
		};
	});

	async function saveDocument(isAutoSave = false) {
		if (saving) return;

		saving = true;
		saveError = null;

		try {
			let response;

			// ALWAYS allow saving drafts (even with validation errors) - Sanity-style
			if (isCreating) {
				// Create new document
				console.log('🔄 Creating new document with data:', {
					type: documentType,
					data: documentData
				});
				response = await documents.create({
					type: documentType,
					data: documentData
				});

				console.log('📝 Document creation response:', response);

				if (response.success && response.data) {
					console.log('✅ Document created successfully with ID:', response.data.id);
					// Set flag to prevent loadDocumentData from overwriting our data
					justCreatedDocument = true;
					// Store the response data for hash comparison
					fullDocument = response.data;
					// Always call onSaved to switch to edit mode after creation
					onSaved?.(response.data.id);
				} else {
					console.error('❌ Document creation failed:', response);
				}
			} else if (documentId) {
				// Update existing document
				response = await documents.updateById(documentId, {
					data: documentData
				});

				// Update fullDocument with the response to keep saved data in sync
				// We need to sync fullDocument to match what we just saved (documentData)
				// instead of what the server returned, in case server adds extra metadata
				if (response?.success && response.data) {
					const { id: responseId, _meta } = response.data;
					// Reconstruct fullDocument using the data we sent (documentData)
					// plus the id and _meta from the response
					fullDocument = {
						id: responseId,
						_meta,
						...documentData
					};
				}
			}

			if (response?.success) {
				lastSaved = new Date();
				hasUnsavedChanges = false;
				if (isAutoSave) {
					// Trigger validation on all fields after auto-save
					validateAllFields(); // Update validation status
					schemaFields.forEach((fieldComponent, index) => {
						const field = schema.fields[index];
						if (fieldComponent && field) {
							fieldComponent.performValidation(documentData[field.name], {});
						}
					}); // Notify parent of autosave with current title
					if (onAutoSaved && documentId) {
						onAutoSaved(documentId, getPreviewTitle());
					}
				}
			} else {
				throw new Error(response?.error || 'Failed to save document');
			}
		} catch (err) {
			console.error('Failed to save document:', err);

			// Extract validation errors if present
			if (err instanceof ApiError && err.response?.validationErrors) {
				const validationErrors = err.response.validationErrors;
				const errorMessages = validationErrors
					.map((ve: any) => `${ve.field}: ${ve.errors.join(', ')}`)
					.join('; ');
				saveError = `Validation failed: ${errorMessages}`;
			} else {
				saveError = err instanceof ApiError ? err.message : 'Failed to save document';
			}
		} finally {
			saving = false;
		}
	}

	async function publishDocument() {
		if (!documentId || saving) return;

		// Check for validation errors before publishing (Sanity-style)
		await validateAllFields();

		if (hasValidationErrors) {
			saveError = 'Cannot publish: Please fix validation errors first';
			return;
		}

		saving = true;
		saveError = null;

		try {
			const response = await documents.publish(documentId);

			if (response.success && response.data) {
				// Update local state with new published hash
				fullDocument = response.data;
				lastSaved = new Date();
				publishSuccess = new Date();
				console.log('✅ Document published successfully');
				console.log('📄 New published hash:', response.data.publishedHash);

				// Notify parent that document was published
				if (onPublished && documentId) {
					onPublished(documentId);
				}
			} else {
				throw new Error(response.error || 'Failed to publish document');
			}
		} catch (err) {
			console.error('Failed to publish document:', err);

			// Extract validation errors if present
			if (err instanceof ApiError && err.response?.validationErrors) {
				const validationErrors = err.response.validationErrors;
				const errorMessages = validationErrors
					.map((ve: any) => `${ve.field}: ${ve.errors.join(', ')}`)
					.join('; ');
				saveError = `Cannot publish - Validation failed: ${errorMessages}`;
			} else {
				saveError = err instanceof ApiError ? err.message : 'Failed to publish document';
			}
		} finally {
			saving = false;
		}
	}

	// Validate all fields before publishing
	async function validateAllFields(): Promise<void> {
		if (!schema) {
			hasValidationErrors = false;
			return;
		}

		let errorsFound = false;

		for (const field of schema.fields) {
			if (field.validation) {
				try {
					const validationFunctions = Array.isArray(field.validation)
						? field.validation
						: [field.validation];

					for (const validationFn of validationFunctions) {
						const rule = validationFn(new Rule());
						const markers = await rule.validate(documentData[field.name], { path: [field.name] });

						if (markers.some((m) => m.level === 'error')) {
							errorsFound = true;
							console.log(`❌ Validation error in field '${field.name}':`, markers);
						}
					}
				} catch (error) {
					errorsFound = true;
					console.error(`Validation failed for field '${field.name}':`, error);
				}
			}
		}

		hasValidationErrors = errorsFound;
	}

	async function deleteDocument() {
		if (!documentId || saving) return;

		const confirmDelete = confirm(
			`Are you sure you want to delete this document? This action cannot be undone.`
		);
		if (!confirmDelete) return;

		saving = true;
		saveError = null;

		try {
			const response = await documents.deleteById(documentId);

			if (response.success) {
				console.log('✅ Document deleted successfully');
				onDeleted?.();
			} else {
				throw new Error(response.error || 'Failed to delete document');
			}
		} catch (err) {
			console.error('Failed to delete document:', err);
			saveError = err instanceof ApiError ? err.message : 'Failed to delete document';
		} finally {
			saving = false;
		}
	}

	// Schema cleanup functions
	function removeOrphanedField(fieldToRemove: OrphanedField) {
		// Deep clone to ensure nested object changes trigger reactivity
		const newData = JSON.parse(JSON.stringify(documentData));

		if (fieldToRemove.level === 'document') {
			delete newData[fieldToRemove.key];
		} else {
			// Handle nested field removal (more complex path-based deletion)
			removeFieldByPath(newData, fieldToRemove.path);
		}

		documentData = newData;
		hasUnsavedChanges = true;

		// Remove from orphaned fields list
		orphanedFields = orphanedFields.filter((f) => f !== fieldToRemove);

		// Hide warning if no more orphaned fields
		if (orphanedFields.length === 0) {
			showOrphanedFields = false;
		}
	}

	function removeFieldByPath(obj: any, path: string) {
		const parts = path.split('.');
		let current = obj;

		for (let i = 0; i < parts.length - 1; i++) {
			const part = parts[i];
			if (part.includes('[') && part.includes(']')) {
				// Handle array index like "items[0]"
				const [key, indexStr] = part.split('[');
				const index = parseInt(indexStr.replace(']', ''));
				current = current[key][index];
			} else {
				current = current[part];
			}
		}

		const lastPart = parts[parts.length - 1];
		delete current[lastPart];
	}

	function cleanupAllOrphanedFields() {
		if (!schema) return;

		const cleanupResult = findOrphanedFields(documentData, schema);
		documentData = cleanupResult.cleanedData;
		hasUnsavedChanges = true;
		showOrphanedFields = false;
		orphanedFields = [];
	}

	function dismissOrphanedFields() {
		showOrphanedFields = false;
	}
</script>

<div class="relative flex h-full flex-col">
	<!-- Header Toolbar (Sanity-style) -->
	<div class="border-border bg-background flex h-14 items-center justify-between border-b px-4">
		<!-- Left side: Document info and status -->
		<div class="flex items-center gap-3 overflow-hidden">
			<div class="min-w-0 flex-1">
				<h3 class="truncate text-sm font-medium">
					{getPreviewTitle()}
				</h3>
				<div class="flex items-center gap-2">
					{#if saving}
						<span class="text-muted-foreground text-xs">Saving...</span>
					{:else if lastSaved}
						<span class="text-muted-foreground text-xs">
							Saved {lastSaved.toLocaleTimeString()}
						</span>
					{:else if hasUnsavedChanges}
						<span class="text-muted-foreground text-xs">Unsaved changes</span>
					{/if}

					<!-- Created by -->
					{#if fullDocument?.createdBy}
						<span class="text-muted-foreground hidden text-xs sm:inline">
							• Created by {typeof fullDocument.createdBy === 'string'
								? fullDocument.createdBy
								: fullDocument.createdBy.name || fullDocument.createdBy.email}
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Right side: Actions and close button -->
		<div class="flex items-center gap-2">
			<!-- Status badges -->
			{#if saving}
				<Badge variant="secondary" class="hidden sm:flex">Saving...</Badge>
			{:else if publishSuccess && new Date().getTime() - publishSuccess.getTime() < 3000}
				<Badge variant="default" class="hidden sm:flex">Published!</Badge>
			{:else if hasUnpublishedContent}
				<Badge variant="outline" class="hidden sm:flex">Unpublished</Badge>
			{:else if lastSaved}
				<Badge variant="secondary" class="hidden sm:flex">Saved</Badge>
			{/if}

			<!-- Close button (X) - hidden on mobile -->
			<Button
				variant="ghost"
				size="icon"
				onclick={onBack}
				class="hidden h-8 w-8 hover:cursor-pointer lg:flex"
				title="Close"
			>
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
	</div>

	<!-- Content Form -->
	<div class="flex-1 space-y-4 overflow-auto p-4 lg:space-y-6 lg:p-6">
		{#if saveError}
			<div class="bg-destructive/10 border-destructive/20 rounded-md border p-3">
				<p class="text-destructive text-sm">{saveError}</p>
			</div>
		{/if}

		{#if schemaError}
			<div class="bg-destructive/10 border-destructive/20 rounded-md border p-3">
				<p class="text-destructive text-sm">Schema Error: {schemaError}</p>
			</div>
		{:else if schemaLoading}
			<div class="p-6 text-center">
				<div class="text-muted-foreground text-sm">Loading schema...</div>
			</div>
		{:else if schema}
			<!-- Orphaned Fields Warning -->
			{#if showOrphanedFields && orphanedFields.length > 0}
				<div class="space-y-3 rounded-md border border-orange-200 bg-orange-50 p-4">
					<div class="flex items-center gap-2">
						<svg
							class="h-5 w-5 text-orange-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.081 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
						<h4 class="text-sm font-medium text-orange-800">
							{orphanedFields.length} orphaned field{orphanedFields.length === 1 ? '' : 's'} detected
						</h4>
					</div>

					<p class="text-sm text-orange-700">
						These fields exist in your document but are no longer defined in the schema:
					</p>

					<div class="space-y-2">
						{#each orphanedFields as field, index (index)}
							<div
								class="flex items-center justify-between rounded border border-orange-200 bg-white p-3"
							>
								<div class="flex-1">
									<div class="font-mono text-sm font-medium text-orange-800">
										{field.path || field.key}
									</div>
									<div class="mt-1 text-xs text-orange-600">
										<code class="rounded bg-orange-100 px-1">{JSON.stringify(field.value)}</code>
									</div>
								</div>
								<Button
									size="sm"
									variant="outline"
									onclick={() => removeOrphanedField(field)}
									class="ml-3 h-8 border-red-200 px-3 text-red-600 hover:border-red-300 hover:bg-red-50"
								>
									Remove
								</Button>
							</div>
						{/each}
					</div>

					<div class="flex gap-2 border-t border-orange-200 pt-2">
						<Button
							size="sm"
							variant="outline"
							onclick={cleanupAllOrphanedFields}
							class="border-orange-600 bg-orange-600 text-white hover:bg-orange-700"
						>
							Remove All
						</Button>
						<Button
							size="sm"
							variant="ghost"
							onclick={dismissOrphanedFields}
							class="text-orange-700 hover:text-orange-800"
						>
							Dismiss
						</Button>
					</div>
				</div>
			{/if}

			<!-- Dynamic Schema Fields -->
			{#each schema.fields as field, index (index)}
				<SchemaField
					{field}
					value={documentData[field.name]}
					{documentData}
					onUpdate={(newValue) => {
						documentData = { ...documentData, [field.name]: newValue };
						hasUnsavedChanges = true;
					}}
					{onOpenReference}
					schemaType={documentType}
					readonly={isReadOnly}
					organizationId={fullDocument?._meta?.organizationId}
				/>
			{/each}
		{:else}
			<div class="border-muted-foreground/30 rounded-md border border-dashed p-4">
				<p class="text-muted-foreground text-center text-sm">
					No schema found for document type: {documentType}
				</p>
			</div>
		{/if}
	</div>

	<!-- Sanity-style bottom bar -->
	{#if documentId}
		<div class="border-border bg-background border-t p-4">
			<div class="flex items-center justify-between">
				<!-- Left: Save status badges -->
				<div class="flex items-center gap-2">
					{#if saving}
						<Badge variant="secondary">Saving...</Badge>
					{:else if publishSuccess && new Date().getTime() - publishSuccess.getTime() < 3000}
						<Badge variant="default">Published!</Badge>
					{:else if hasUnsavedChanges}
						<Badge variant="outline">Unsaved</Badge>
					{:else if hasUnpublishedContent}
						<Badge variant="outline">Unpublished Changes</Badge>
					{:else if lastSaved}
						<Badge variant="secondary">Saved</Badge>
					{/if}
				</div>

				<!-- Right: Publish button + horizontal three dots menu -->
				<div class="flex items-center gap-2">
					{#if !isReadOnly}
						<Button
							onclick={publishDocument}
							disabled={!canPublish}
							size="sm"
							variant={canPublish ? 'default' : 'secondary'}
							class="cursor-pointer"
						>
							{#if saving}
								Publishing...
							{:else if !hasUnpublishedContent}
								Published
							{:else}
								Publish Changes
							{/if}
						</Button>
					{:else}
						<Badge variant="secondary" class="text-xs">Read Only</Badge>
					{/if}

					<!-- Horizontal three dots menu (only for non-read-only users) -->
					{#if !isReadOnly}
						<div class="relative">
							<Button
								onclick={() => (showDropdown = !showDropdown)}
								variant="ghost"
								class="hover:bg-muted flex h-8 w-8 items-center justify-center rounded transition-colors"
							>
								<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 12h.01M12 12h.01M19 12h.01"
									/>
								</svg>
							</Button>

							{#if showDropdown}
								<!-- Dropdown menu -->
								<div
									class="bg-background border-border absolute right-0 bottom-full z-50 mb-2 min-w-[140px] rounded-md border py-1 shadow-lg"
								>
									<Button
										variant="ghost"
										onclick={() => {
											showDropdown = false;
											deleteDocument();
										}}
										class="hover:bg-muted text-destructive flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
									>
										Delete document
									</Button>
								</div>

								<!-- Click outside to close -->
								<div
									class="fixed inset-0 z-40"
									use:elementEvents={{
										events: [{ name: 'click', handler: () => (showDropdown = false) }]
									}}
								></div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
