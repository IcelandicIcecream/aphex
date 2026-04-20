<script lang="ts">
	import { tick } from 'svelte';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { documents } from '../../api/documents';
	import { ApiError } from '../../api/client';
	import SchemaField from './SchemaField.svelte';
	import { findOrphanedFields, type OrphanedField } from '../../schema-utils/cleanup';
	import type { SchemaType } from '../../types/schemas.js';
	import { Rule } from '../../field-validation/rule';
	import { hasUnpublishedChanges } from '../../utils/content-hash';
	import { setSchemaContext } from '../../schema-context.svelte';
	import { getDefaultValueForFieldType } from '../../utils/field-defaults';
	import { cmsLogger } from '../../utils/logger';
	import { toast } from 'svelte-sonner';
	import { confirmDialog } from './confirm-dialog/confirm-dialog.svelte';
	import { History, Trash2, Ellipsis, Code } from '@lucide/svelte';

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
		onOpenVersionHistory?: (documentId: string) => void;
		externalVersionPreview?: { versionNumber: number; data: Record<string, any>; eventType: string; createdAt?: string } | null;
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
		onOpenVersionHistory,
		externalVersionPreview = null,
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


	// Perspective toggle
	let perspective = $state<'draft' | 'published'>('draft');
	let publishedData = $state<Record<string, any> | null>(null);
	const isViewingPublished = $derived(perspective === 'published');

	// Inspect modal
	let showInspect = $state(false);

	function syntaxHighlightJson(json: string): string {
		return json.replace(
			/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
			(match) => {
				let cls = 'text-green-400'; // number
				if (/^"/.test(match)) {
					if (/:$/.test(match)) {
						// key
						const key = match.slice(0, -1); // remove trailing colon
						return `<span class="text-blue-400">${escapeHtml(key)}</span>:`;
					} else {
						cls = 'text-yellow-500'; // string
					}
				} else if (/true|false/.test(match)) {
					cls = 'text-orange-400'; // boolean
				} else if (/null/.test(match)) {
					cls = 'text-red-400'; // null
				}
				return `<span class="${cls}">${escapeHtml(match)}</span>`;
			}
		);
	}

	function escapeHtml(str: string): string {
		return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}
	let inspectTab = $state<'parsed' | 'raw'>('parsed');

	// Header options dropdown
	let showHeaderMenu = $state(false);

	// Version history
	let showVersionHistory = $state(false);
	let previewingVersion = $state<{ versionNumber: number; data: Record<string, any>; eventType: string; createdAt?: string } | null>(null);
	const activePreview = $derived(externalVersionPreview || previewingVersion);
	const isPreviewingVersion = $derived(!!activePreview);

	// Ticker to keep relative time updating
	let now = $state(Date.now());
	let tickerInterval: ReturnType<typeof setInterval> | null = null;

	$effect(() => {
		tickerInterval = setInterval(() => {
			now = Date.now();
		}, 10_000); // update every 10s
		return () => {
			if (tickerInterval) clearInterval(tickerInterval);
		};
	});

	function timeAgo(date: Date): string {
		const seconds = Math.floor((now - date.getTime()) / 1000);
		if (seconds < 5) return 'just now';
		if (seconds < 60) return `${seconds}s ago`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		return date.toLocaleDateString();
	}

	const savedAgoText = $derived(lastSaved ? `Saved ${timeAgo(lastSaved)}` : null);

	// Auto-save functionality (every 2 seconds when there are changes)
	let hasUnsavedChanges = $state(false);
	let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
	let hasValidationErrors = $state(false);

	let orphanedFields = $state<OrphanedField[]>([]);
	let showOrphanedFields = $state(false);
	let schemaFields: SchemaField[] = [];

	// Track previous document to detect actual switches (not create→edit transitions)
	// Plain lets (not $state) — only read/written inside the clearing effect; no need for reactivity
	let previousDocumentId: string | null | undefined = undefined;
	let previousDocumentType: string | undefined = undefined;
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

		cmsLogger.debug('[Document Editor]', 'hasValidationErrors: ', hasValidationErrors);

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
			perspective = 'draft';
			publishedData = null;
			previewingVersion = null;

			// Cancel pending auto-save
			if (autoSaveTimer) {
				clearTimeout(autoSaveTimer);
				autoSaveTimer = null;
			}

			cmsLogger.debug(
				'[Document Editor]',
				'🧹 Cleared state for document switch:',
				_docType,
				_docId || 'new'
			);
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
				cmsLogger.debug(
					'[Document Editor]',
					'⏭️  Skipping loadDocumentData - just created document'
				);
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

		cmsLogger.debug('[Document Editor]', 'RUNNING LOAD SCHEMA');
		cmsLogger.debug('[Document Editor]', 'SCHEMAS: ', schemas);

		try {
			// Find schema from provided schemas
			const foundSchema = schemas.find((s) => s.name === documentType);

			if (foundSchema) {
				schema = foundSchema;
			} else {
				throw new Error(`Schema type '${documentType}' not found`);
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to load schema');
			schemaError = err instanceof Error ? err.message : 'Failed to load schema';
		} finally {
			schemaLoading = false;
		}
	}

	async function loadDocumentData() {
		if (!documentId) return;

		cmsLogger.debug('[Document Editor]', '📄 Loading document data for:', documentId);

		try {
			const response = await documents.getById(documentId);

			if (response.success && response.data) {
				// Store full document for hash comparison
				fullDocument = response.data;

				// With LocalAPI, data is flattened at top level (not in draftData)
				// Extract all fields except id and _meta
				const { id: _id, _meta, ...data } = response.data;
				cmsLogger.debug('[Document Editor', '📄 Full response.data:', _id)
				cmsLogger.debug('[Document Editor]', '📄 Full response.data:', response.data);
				cmsLogger.debug('[Document Editor]', '📄 Extracted data (after destructuring):', data);
				cmsLogger.debug('[Document Editor]', '📄 Keys in extracted data:', Object.keys(data));
				cmsLogger.debug('[Document Editor]', '📄 Published hash:', _meta?.publishedHash);

				documentData = { ...data };
				cmsLogger.debug('[Document Editor]', '📄 documentData after assignment:', documentData);
				cmsLogger.debug('[Document Editor]', '📄 Keys in documentData:', Object.keys(documentData));
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
				cmsLogger.debug('[Document Editor]', '❌ Failed to load document data:', response.error);
				saveError = response.error || 'Failed to load document';
			}
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : 'Failed to load document');
			saveError = err instanceof ApiError ? err.message : 'Failed to load document';
		}
	}

	async function initializeDocument() {
		if (!schema) return;

		cmsLogger.debug('[Document Editor]', '🆕 Initializing new document with field defaults');

		// Initialize document data with field defaults
		const initialData: Record<string, any> = {};

		for (const field of schema.fields) {
			if ('initialValue' in field && field.initialValue !== undefined) {
				// Resolve initialValue if it's a function
				if (typeof field.initialValue === 'function') {
					try {
						initialData[field.name] = await field.initialValue();
					} catch (error) {
						toast.error(`Failed to resolve initial value for "${field.name}"`);
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
		cmsLogger.debug('[Document Editor]', '✅ Document initialized with:', initialData);
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
	// Strips _key fields since those are auto-generated and not real content changes
	function sortObjectForComparison(item: any): any {
		if (item === null || typeof item !== 'object') return item;

		if (Array.isArray(item)) {
			return item.map(sortObjectForComparison);
		}

		const { _key, ...rest } = item;
		item = rest;

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
				cmsLogger.debug(
					'[Document Editor]',
					'🔄 Auto-saving after typing pause (data changed)...',
					{
						documentId
					}
				);
				saveDocument(true); // auto-save
			}, 1200); // Shorter delay - saves faster but still waits for typing pauses
		} else if (!hasChanges) {
			cmsLogger.debug('[Document Editor]', '⏭️  Skipping auto-save - no changes from saved data');
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
				cmsLogger.debug('[Document Editor]', '🔄 Creating new document with data:', {
					type: documentType,
					data: documentData
				});
				response = await documents.create({
					type: documentType,
					data: documentData
				});

				cmsLogger.debug('[Document Editor]', '📝 Document creation response:', response);

				if (response.success && response.data) {
					cmsLogger.debug(
						'[Document Editor]',
						'✅ Document created successfully with ID:',
						response.data.id
					);
					// Set flag to prevent loadDocumentData from overwriting our data
					justCreatedDocument = true;
					// Store the response data for hash comparison
					fullDocument = response.data;
					// Always call onSaved to switch to edit mode after creation
					onSaved?.(response.data.id);
				} else {
					toast.error(response?.error || 'Failed to create document');
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
					cmsLogger.debug('[Document Editor]', 'meta response data:', response.data);
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
						const field = schema?.fields[index];
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
			toast.error(err instanceof ApiError ? err.message : 'Failed to save document');

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
				cmsLogger.debug('[Document Editor]', '✅ Document published successfully');
				cmsLogger.debug('[Document Editor]', '📄 New published hash:', response.data.publishedHash);

				// Notify parent that document was published
				if (onPublished && documentId) {
					onPublished(documentId);
				}
			} else {
				throw new Error(response.error || 'Failed to publish document');
			}
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : 'Failed to publish document');

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

	async function switchPerspective(newPerspective: 'draft' | 'published') {
		if (newPerspective === perspective) return;

		if (newPerspective === 'published') {
			if (!documentId) return;
			// Fetch published version of the document
			try {
				const response = await documents.getById(`${documentId}?perspective=published`);
				if (response.success && response.data) {
					publishedData = response.data;
					perspective = 'published';
				} else {
					toast.error('No published version available');
				}
			} catch {
				toast.error('Failed to load published version');
			}
		} else {
			perspective = 'draft';
			publishedData = null;
		}
	}

	async function unpublishDocument() {
		if (!documentId || saving) return;

		const confirmUnpublish = await confirmDialog({
			title: 'Unpublish this document?',
			description:
				'It will be removed from published queries, but the data is preserved and you can re-publish anytime.',
			confirmText: 'Unpublish',
			variant: 'destructive'
		});
		if (!confirmUnpublish) return;

		saving = true;
		saveError = null;

		try {
			const response = await documents.unpublish(documentId);
			if (response.success) {
				fullDocument = { ...fullDocument, _meta: { ...fullDocument?._meta, status: 'unpublished' } };
				toast.success('Document unpublished — you can re-publish anytime');
			} else {
				throw new Error(response.error || 'Failed to unpublish');
			}
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : 'Failed to unpublish document');
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

						if (markers.some((m: any) => m.level === 'error')) {
							errorsFound = true;
							cmsLogger.debug(
								`[DocumentEditor] Validation error in field '${field.name}':`,
								markers
							);
						}
					}
				} catch (error) {
					errorsFound = true;
					toast.error(`Validation failed for field "${field.name}"`);
				}
			}
		}

		hasValidationErrors = errorsFound;
	}

	async function deleteDocument() {
		if (!documentId || saving) return;

		const confirmDelete = await confirmDialog({
			title: 'Delete this document?',
			description: 'This action cannot be undone.',
			confirmText: 'Delete',
			variant: 'destructive'
		});
		if (!confirmDelete) return;

		saving = true;
		saveError = null;

		try {
			const response = await documents.deleteById(documentId);

			if (response.success) {
				cmsLogger.debug('[Document Editor]', '✅ Document deleted successfully');
				onDeleted?.();
			} else {
				throw new Error(response.error || 'Failed to delete document');
			}
		} catch (err) {
			toast.error(err instanceof ApiError ? err.message : 'Failed to delete document');
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
			const part = parts[i]!;
			if (part.includes('[') && part.includes(']')) {
				// Handle array index like "items[0]"
				const [key, indexStr] = part.split('[');
				const index = parseInt(indexStr!.replace(']', ''));
				current = current[key!][index];
			} else {
				current = current[part];
			}
		}

		const lastPart = parts[parts.length - 1]!;
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

<div class="relative flex h-full flex-col overflow-hidden">
	<!-- Header Toolbar (Sanity-style) -->
	<div class="border-rule bg-background flex h-14 items-center justify-between border-b px-4">
		<!-- Left side: Document info and status -->
		<div class="flex items-center gap-3 overflow-hidden">
			<div class="min-w-0 flex-1">
				<h3 class="truncate text-sm font-medium">
					{getPreviewTitle()}
				</h3>
				<div class="flex items-center gap-2">
					{#if saving}
						<span class="text-muted-foreground text-xs">Saving...</span>
					{:else if savedAgoText}
						<span class="text-muted-foreground text-xs">
							{savedAgoText}
						</span>
					{:else if hasUnsavedChanges}
						<span class="text-muted-foreground text-xs">Unsaved changes</span>
					{/if}

					<!-- Created by -->
					{#if fullDocument?.createdBy}
						<span class="text-muted-foreground hidden text-xs sm:inline">
							• Created by {typeof fullDocument.createdBy === 'string'
								? (fullDocument.createdBy.startsWith('apikey:') ? 'API Key' : fullDocument.createdBy)
								: fullDocument.createdBy.name || fullDocument.createdBy.email}
						</span>
					{/if}
				</div>
			</div>
		</div>

		<!-- Right side: Perspective toggle, actions, close -->
		<div class="flex items-center gap-2">
			<!-- Perspective toggle -->
			{#if documentId && fullDocument?._meta?.publishedHash}
				<div class="flex rounded-md border">
					<button
						class="px-2.5 py-1 text-xs font-medium transition-colors {perspective === 'draft' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}"
						onclick={() => switchPerspective('draft')}
					>
						Draft
					</button>
					<button
						class="px-2.5 py-1 text-xs font-medium transition-colors {perspective === 'published' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}"
						onclick={() => switchPerspective('published')}
					>
						Published
					</button>
				</div>
			{/if}


			<!-- Options dropdown -->
			{#if documentId}
				<div class="relative">
					<Button
						variant="ghost"
						size="icon"
						onclick={() => (showHeaderMenu = !showHeaderMenu)}
						class="h-8 w-8"
					>
						<Ellipsis class="h-4 w-4" />
					</Button>
					{#if showHeaderMenu}
						<div class="bg-background border-rule absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-md border py-1 shadow-lg">
							<button
								onclick={() => {
									showHeaderMenu = false;
									if (onOpenVersionHistory && documentId) {
										onOpenVersionHistory(documentId);
									} else {
										showVersionHistory = true;
									}
								}}
								class="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
							>
								<History class="h-3.5 w-3.5" /> History
							</button>
							<button
								onclick={() => {
									showHeaderMenu = false;
									showInspect = true;
								}}
								class="hover:bg-muted flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
							>
								<Code class="h-3.5 w-3.5" /> Inspect
							</button>
						</div>
						<div
							class="fixed inset-0 z-40"
							onclick={() => (showHeaderMenu = false)}
						></div>
					{/if}
				</div>
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
	<div class="flex-1 overflow-auto p-4 lg:p-6">
		<div class="mx-auto w-full max-w-3xl space-y-4 lg:space-y-6">
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
			<svelte:boundary
				onerror={(error) => cmsLogger.error('[DocumentEditor]', 'Error in editor content:', error)}
			>
				{#each schema.fields as field, index (index)}
					{@const viewData = isPreviewingVersion && activePreview ? activePreview.data : isViewingPublished && publishedData ? publishedData : documentData}
					<SchemaField
						{field}
						value={viewData[field.name]}
						documentData={viewData}
						onUpdate={(newValue) => {
							if (isViewingPublished) return;
							documentData = { ...documentData, [field.name]: newValue };
							hasUnsavedChanges = true;
						}}
						{onOpenReference}
						schemaType={documentType}
						readonly={isReadOnly || isViewingPublished || isPreviewingVersion}
						organizationId={fullDocument?._meta?.organizationId}
					/>
				{/each}

				{#snippet failed(error, reset)}
					<div class="border-destructive/30 bg-destructive/5 rounded-md border p-4 text-center">
						<p class="text-destructive font-medium">Document editor encountered an error</p>
						<p class="text-muted-foreground mt-1 text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
						<button
							class="bg-primary text-primary-foreground mt-3 rounded px-4 py-2 text-sm"
							onclick={reset}
						>
							Reload editor
						</button>
					</div>
				{/snippet}
			</svelte:boundary>
		{:else}
			<div class="border-muted-foreground/30 rounded-md border border-dashed p-4">
				<p class="text-muted-foreground text-center text-sm">
					No schema found for document type: {documentType}
				</p>
			</div>
		{/if}
		</div>
	</div>

	<!-- Sanity-style bottom bar -->
	{#if documentId}
		<div class="border-rule bg-background relative z-50 border-t p-4">
			{#if isPreviewingVersion && activePreview}
				<!-- Version preview footer -->
				<div class="flex items-center justify-between">
					<p class="text-muted-foreground text-sm">
						Revision from {new Date(activePreview.createdAt || Date.now()).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
					</p>
					<Button
						size="sm"
						onclick={async () => {
							if (!documentId || !activePreview) return;
							try {
								await documents.restoreVersion(documentId, activePreview.versionNumber);
								const docRes = await documents.getById(documentId);
								if (docRes.success && docRes.data) {
									const doc = docRes.data as Record<string, any>;
									fullDocument = doc;
									const newData: Record<string, any> = {};
									if (schema) {
										for (const field of schema.fields) {
											if (doc[field.name] !== undefined) {
												newData[field.name] = doc[field.name];
											}
										}
									}
									documentData = newData;
									hasUnsavedChanges = false;
									lastSaved = new Date();
								}
								previewingVersion = null;
								perspective = 'draft';
								publishedData = null;
								toast.success('Revision restored');
							} catch {
								toast.error('Failed to restore revision');
							}
						}}
					>
						Restore
					</Button>
				</div>
			{:else if isViewingPublished}
				<!-- Published view footer -->
				<div class="flex items-center justify-between">
					<p class="text-muted-foreground text-sm">
						{#if fullDocument?._meta?.status === 'unpublished'}
							Unpublished
						{:else}
							Published on {fullDocument?._meta?.publishedAt ? new Date(fullDocument._meta.publishedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : 'Unknown'}
						{/if}
					</p>
					{#if fullDocument?._meta?.status === 'unpublished'}
						<Button
							size="sm"
							onclick={publishDocument}
							disabled={saving}
						>
							Publish
						</Button>
					{:else}
						<Button
							size="sm"
							variant="secondary"
							onclick={unpublishDocument}
							disabled={saving}
						>
							Unpublish
						</Button>
					{/if}
				</div>
			{:else}
			<div class="flex items-center justify-between">
				<!-- Left: Save status badges -->
				<div class="flex items-center gap-2">
					{#if saving}
						<Badge variant="secondary">Saving...</Badge>
					{:else if publishSuccess && now - publishSuccess.getTime() < 3000}
						<Badge variant="default">Published!</Badge>
					{:else if hasUnsavedChanges}
						<Badge variant="outline">Unsaved</Badge>
					{:else if savedAgoText}
						<Badge variant="secondary">{savedAgoText}</Badge>
					{/if}
				</div>

				<!-- Right: Publish button + horizontal three dots menu -->
				<div class="flex items-center gap-2">
					{#if !isReadOnly && !isViewingPublished}
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
					{:else if isReadOnly}
						<Badge variant="secondary" class="text-xs">Read Only</Badge>
					{/if}

					{#if !isReadOnly}
						<Button
							variant="ghost"
							size="icon"
							class="h-8 w-8 text-muted-foreground hover:text-destructive"
							onclick={deleteDocument}
							title="Delete document"
						>
							<Trash2 class="h-4 w-4" />
						</Button>
					{/if}
				</div>
			</div>
			{/if}
		</div>
	{/if}

	<!-- Version History Panel -->
	{#if showVersionHistory && documentId}
		<div class="absolute inset-0 z-50 flex">
			<!-- Backdrop -->
			<button
				class="flex-1 bg-black/30"
				onclick={() => { showVersionHistory = false; previewingVersion = null; }}
			></button>
			<!-- Panel -->
			<div class="bg-background border-rule flex w-80 flex-col border-l shadow-lg">
				<div class="border-rule flex items-center justify-between border-b px-4 py-3">
					<h3 class="text-sm font-medium">Version History</h3>
					<button
						class="hover:bg-muted rounded p-1 transition-colors"
						onclick={() => { showVersionHistory = false; previewingVersion = null; }}
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				<div class="flex-1 overflow-auto">
					{#await documents.listVersions(documentId)}
						<div class="p-4 text-center">
							<span class="text-muted-foreground text-sm">Loading versions...</span>
						</div>
					{:then response}
						{#if response.success && response.data && response.data.length > 0}
							<div class="divide-y">
								{#each response.data as version}
									<button
										class="w-full space-y-1 px-4 py-3 text-left transition-colors hover:bg-muted {previewingVersion?.versionNumber === version.versionNumber ? 'bg-muted border-l-primary border-l-2' : ''}"
										onclick={async () => {
											try {
												const res = await documents.getVersion(documentId, version.versionNumber);
												if (res.success && res.data) {
													previewingVersion = {
														versionNumber: version.versionNumber,
														data: res.data.data ?? {},
														eventType: version.eventType
													};
												}
											} catch {
												toast.error('Failed to load version');
											}
										}}
									>
										<div class="flex items-center gap-2">
											<span class="text-xs font-medium">v{version.versionNumber}</span>
											<Badge variant={version.eventType === 'publish' ? 'default' : version.eventType === 'restore' ? 'outline' : 'secondary'} class="text-[10px]">
												{version.eventType}
											</Badge>
										</div>
										<p class="text-muted-foreground text-[11px]">
											{version.createdAt ? new Date(version.createdAt).toLocaleString() : ''}
										</p>
									</button>
								{/each}
							</div>
						{:else}
							<div class="p-4 text-center">
								<span class="text-muted-foreground text-sm">No versions yet</span>
							</div>
						{/if}
					{:catch}
						<div class="p-4 text-center">
							<span class="text-destructive text-sm">Failed to load versions</span>
						</div>
					{/await}
				</div>
			</div>
		</div>
	{/if}

	<!-- Inspect Modal -->
	{#if showInspect}
		<div class="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
			<div class="bg-background border-rule mx-4 flex h-[80%] w-full max-w-3xl flex-col rounded-lg border shadow-xl">
				<!-- Modal header -->
				<div class="flex items-center justify-between border-b px-4 py-3">
					<div>
						<h3 class="text-sm font-semibold">Inspecting <em>{getPreviewTitle()}</em></h3>
					</div>
					<Button
                   	    variant="ghost"
						class="hover:bg-muted rounded p-1 transition-colors"
						onclick={() => (showInspect = false)}
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</Button>
				</div>

				<!-- Tabs -->
				<div class="border-b flex">
					<button
						class="px-4 py-2 text-sm font-medium transition-colors {inspectTab === 'parsed' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}"
						onclick={() => (inspectTab = 'parsed')}
					>
						Parsed
					</button>
					<button
						class="px-4 py-2 text-sm font-medium transition-colors {inspectTab === 'raw' ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}"
						onclick={() => (inspectTab = 'raw')}
					>
						Raw JSON
					</button>
				</div>

				<!-- Content -->
				<div class="flex-1 overflow-auto p-4 font-mono text-sm">
					{#if inspectTab === 'raw'}
						<pre
							class="whitespace-pre-wrap break-all text-xs select-text"
							tabindex="0"
							onkeydown={(e) => {
								if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
									e.preventDefault();
									e.stopPropagation();
									const sel = window.getSelection();
									const range = document.createRange();
									range.selectNodeContents(e.currentTarget);
									sel?.removeAllRanges();
									sel?.addRange(range);
								}
							}}
						>{@html syntaxHighlightJson(JSON.stringify({ id: documentId, _meta: fullDocument?._meta, ...documentData }, null, 2))}</pre>
					{:else}
						{@render parsedValue(null, { id: documentId, _meta: fullDocument?._meta, ...documentData }, 0)}
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

{#snippet parsedValue(key: string | null, val: any, depth: number)}
	{#if val && typeof val === 'object'}
		<details class="my-0.5" open={depth < 2}>
			<summary class="cursor-pointer text-xs leading-relaxed">
				{#if key !== null}
					{#if typeof key === 'number' || /^\d+$/.test(String(key))}
						<span class="text-purple-400">{key}:</span>
					{:else}
						<span class="text-blue-400">{key}:</span>
					{/if}
				{/if}
				{#if Array.isArray(val)}
					<span class="text-muted-foreground">[...] {val.length} {val.length === 1 ? 'item' : 'items'}</span>
				{:else}
					<span class="text-muted-foreground">&#123;...&#125; {Object.keys(val).length} {Object.keys(val).length === 1 ? 'property' : 'properties'}</span>
				{/if}
			</summary>
			<div class="ml-4 border-l border-rule/50 pl-3">
				{#if Array.isArray(val)}
					{#each val as item, i}
						{@render parsedValue(String(i), item, depth + 1)}
					{/each}
				{:else}
					{#each Object.entries(val) as [k, v]}
						{@render parsedValue(k, v, depth + 1)}
					{/each}
				{/if}
			</div>
		</details>
	{:else}
		<div class="my-0.5 text-xs leading-relaxed">
			{#if key !== null}
				<span class="text-blue-400">{key}:</span>
			{/if}
			{#if typeof val === 'string'}
				<span class="text-yellow-500">{val}</span>
			{:else if typeof val === 'number'}
				<span class="text-green-400">{val}</span>
			{:else if typeof val === 'boolean'}
				<span class="text-orange-400">{val}</span>
			{:else if val === null || val === undefined}
				<span class="text-red-400">null</span>
			{:else}
				<span class="text-muted-foreground">{JSON.stringify(val)}</span>
			{/if}
		</div>
	{/if}
{/snippet}
