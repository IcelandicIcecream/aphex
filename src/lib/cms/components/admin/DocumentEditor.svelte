<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { documents, schemas, ApiError } from '$lib/api/index.js';
  import SchemaField from './SchemaField.svelte';
  import DebugHashOverlay from './DebugHashOverlay.svelte';
  import type { SchemaType } from '$lib/cms/types';
  import { Rule } from '$lib/cms/validation/Rule.js';
  import { createContentHash, hasUnpublishedChanges } from '$lib/cms/content-hash.js';

  interface Props {
    documentType: string;
    documentId?: string | null;
    isCreating: boolean;
    onBack: () => void;
    onSaved?: (documentId: string) => void;
    onAutoSaved?: (documentId: string, title: string) => void;
    onDeleted?: () => void;
  }

  let { documentType, documentId, isCreating, onBack, onSaved, onAutoSaved, onDeleted }: Props = $props();

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

  // Hash-based state tracking
  const currentDraftHash = $derived(createContentHash(documentData));
  const hasUnpublishedContent = $derived(hasUnpublishedChanges(documentData, fullDocument?.publishedHash || null));
  const canPublish = $derived(hasUnpublishedContent && !saving && documentId);

  // Load schema when documentType is available
  $effect(() => {
    if (documentType) {
      loadSchema();
    }
  });

  // Load existing document data when editing
  $effect(() => {
    if (!isCreating && documentId) {
      loadDocumentData();
    }
  });

  async function loadSchema() {
    schemaLoading = true;
    schemaError = null;

    try {
      const response = await schemas.getByType(documentType);
      if (response.success && response.data) {
        schema = response.data;

        // Initialize document data with field defaults
        const initialData: Record<string, any> = {};
        schema.fields.forEach(field => {
          if (field.type === 'boolean' && 'initialValue' in field) {
            initialData[field.name] = field.initialValue;
          } else {
            initialData[field.name] = '';
          }
        });

        // Only set initial data if creating new document
        if (isCreating) {
          documentData = initialData;
        }
      } else {
        throw new Error(response.error || 'Failed to load schema');
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

        // Load the draft data if available, otherwise published data
        const data = response.data.draftData || response.data.publishedData || {};
        console.log('📄 Loaded document data:', data);
        console.log('📄 Published hash:', response.data.publishedHash);

        documentData = { ...data };
        hasUnsavedChanges = false; // Just loaded, so no unsaved changes
      } else {
        console.error('❌ Failed to load document data:', response.error);
        saveError = response.error || 'Failed to load document';
      }
    } catch (err) {
      console.error('❌ Error loading document data:', err);
      saveError = err instanceof ApiError ? err.message : 'Failed to load document';
    }
  }

  // Check if document has meaningful content (not just empty initialized values)
  function hasMeaningfulContent(data: Record<string, any>): boolean {
    return Object.values(data).some(value => {
      if (typeof value === 'string') return value.trim() !== '';
      if (typeof value === 'boolean') return value !== false; // Assuming false is default
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
      return value !== null && value !== undefined && value !== '';
    });
  }

  // Watch for changes to trigger auto-save (debounced)
  $effect(() => {
    const hasContent = hasMeaningfulContent(documentData);

    // Only set hasUnsavedChanges if we actually have meaningful data
    if (hasContent) {
      hasUnsavedChanges = true;
    }

    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Debounced auto-save - waits for 800ms pause in typing (like Notion/modern apps)
    // Only auto-save if there's meaningful content
    if (hasContent && schema) {
      autoSaveTimer = setTimeout(() => {
        console.log('🔄 Auto-saving after typing pause...', { documentId });
        saveDocument(true); // auto-save
      }, 1200); // Shorter delay - saves faster but still waits for typing pauses
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
        console.log('🔄 Creating new document with data:', { type: documentType, draftData: documentData });
        response = await documents.create({
          type: documentType,
          draftData: documentData
        });

        console.log('📝 Document creation response:', response);

        if (response.success && response.data) {
          console.log('✅ Document created successfully with ID:', response.data.id);
          // Always call onSaved to switch to edit mode after creation
          onSaved?.(response.data.id);
        } else {
          console.error('❌ Document creation failed:', response);
        }
      } else if (documentId) {
        // Update existing document
        response = await documents.updateById(documentId, {
          draftData: documentData
        });
      }

      if (response?.success) {
        lastSaved = new Date();
        hasUnsavedChanges = false;
        if (isAutoSave) {
          console.log('✅ Draft auto-saved (validation errors OK)');
          // Notify parent of autosave with current title
          if (onAutoSaved && documentId) {
            onAutoSaved(documentId, documentData.title || `Untitled`);
          }
        }
      } else {
        throw new Error(response?.error || 'Failed to save document');
      }
    } catch (err) {
      console.error('Failed to save document:', err);
      saveError = err instanceof ApiError ? err.message : 'Failed to save document';
    } finally {
      saving = false;
    }
  }

  async function publishDocument() {
    if (!documentId || saving) return;

    // Check for validation errors before publishing (Sanity-style)
    const hasValidationErrors = await validateAllFields();

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
      } else {
        throw new Error(response.error || 'Failed to publish document');
      }
    } catch (err) {
      console.error('Failed to publish document:', err);
      saveError = err instanceof ApiError ? err.message : 'Failed to publish document';
    } finally {
      saving = false;
    }
  }

  // Validate all fields before publishing
  async function validateAllFields(): Promise<boolean> {
    if (!schema) return false;

    let hasErrors = false;

    for (const field of schema.fields) {
      if (field.validation) {
        try {
          const validationFunctions = Array.isArray(field.validation) ? field.validation : [field.validation];

          for (const validationFn of validationFunctions) {
            const rule = validationFn(new Rule());
            const markers = await rule.validate(documentData[field.name], { path: [field.name] });

            if (markers.some(m => m.level === 'error')) {
              hasErrors = true;
              console.log(`❌ Validation error in field '${field.name}':`, markers);
            }
          }
        } catch (error) {
          hasErrors = true;
          console.error(`Validation failed for field '${field.name}':`, error);
        }
      }
    }

    return hasErrors;
  }


  async function deleteDocument() {
    if (!documentId || saving) return;

    const confirmDelete = confirm(`Are you sure you want to delete this document? This action cannot be undone.`);
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

</script>

<!-- Debug Hash Overlay - Remove this in production -->
<DebugHashOverlay
  {documentData}
  {fullDocument}
  {saving}
  {documentId}
  {hasUnsavedChanges}
  {lastSaved}
/>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="flex items-center justify-between p-4 lg:p-4 border-b border-border bg-muted/20">
    <div class="flex items-center gap-3">
      <!-- Back button only on desktop (mobile uses breadcrumbs) -->
      <Button variant="ghost" size="sm" onclick={onBack} class="hidden lg:flex">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Button>

      <div>
        <h3 class="font-medium text-sm">
          {documentData.title || `Untitled`}
        </h3>
        {#if lastSaved}
          <p class="text-xs text-muted-foreground">
            Last saved: {lastSaved.toLocaleTimeString()}
          </p>
        {:else if hasUnsavedChanges}
          <p class="text-xs text-muted-foreground">Unsaved changes</p>
        {:else if Object.keys(documentData).length > 0}
          <p class="text-xs text-muted-foreground">Ready to edit</p>
        {/if}

        <!-- Debug info -->
        <p class="text-xs text-muted-foreground/50">
          Data keys: {Object.keys(documentData).length} | Schema: {schema ? 'loaded' : 'loading'}
        </p>
      </div>
    </div>

    <div class="flex items-center gap-2">
      {#if saving}
        <Badge variant="secondary">Saving...</Badge>
      {:else if publishSuccess && (new Date().getTime() - publishSuccess.getTime()) < 3000}
        <Badge variant="default">Published!</Badge>
      {:else if hasUnsavedChanges}
        <Badge variant="outline">Unsaved</Badge>
      {:else if hasUnpublishedContent}
        <Badge variant="outline">Unpublished Changes</Badge>
      {:else if lastSaved}
        <Badge variant="secondary">Saved</Badge>
      {/if}


    </div>
  </div>

  <!-- Content Form -->
  <div class="flex-1 overflow-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
    {#if saveError}
      <div class="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
        <p class="text-sm text-destructive">{saveError}</p>
      </div>
    {/if}

    {#if schemaError}
      <div class="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
        <p class="text-sm text-destructive">Schema Error: {schemaError}</p>
      </div>
    {:else if schemaLoading}
      <div class="p-6 text-center">
        <div class="text-sm text-muted-foreground">Loading schema...</div>
      </div>
    {:else if schema}
      <!-- Dynamic Schema Fields -->
      {#each schema.fields as field}
        <SchemaField
          {field}
          value={documentData[field.name]}
          documentData={documentData}
          onUpdate={(newValue) => {
            console.log(`Field ${field.name} updated:`, newValue);
            documentData = { ...documentData, [field.name]: newValue };
            hasUnsavedChanges = true;
          }}
        />
      {/each}
    {:else}
      <div class="p-4 border border-dashed border-muted-foreground/30 rounded-md">
        <p class="text-sm text-muted-foreground text-center">
          No schema found for document type: {documentType}
        </p>
      </div>
    {/if}
  </div>

  <!-- Sanity-style bottom bar -->
  {#if documentId}
    <div class="border-t border-border bg-background p-4">
      <div class="flex items-center justify-between">
        <!-- Left: Save status badges -->
        <div class="flex items-center gap-2">
          {#if saving}
            <Badge variant="secondary">Saving...</Badge>
          {:else if publishSuccess && (new Date().getTime() - publishSuccess.getTime()) < 3000}
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
          <Button
            onclick={publishDocument}
            disabled={!canPublish}
            size="sm"
            variant={canPublish ? "default" : "secondary"}
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

          <!-- Horizontal three dots menu -->
          <div class="relative">
            <button
              onclick={() => showDropdown = !showDropdown}
              class="flex items-center justify-center w-8 h-8 rounded hover:bg-muted transition-colors"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01" />
              </svg>
            </button>

            {#if showDropdown}
              <!-- Dropdown menu -->
              <div class="absolute bottom-full right-0 mb-2 bg-background border border-border rounded-md shadow-lg py-1 min-w-[140px] z-50">
                <button
                  onclick={() => {
                    showDropdown = false;
                    deleteDocument();
                  }}
                  class="w-full px-3 py-2 text-left text-sm hover:bg-muted text-destructive transition-colors flex items-center gap-2"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete document
                </button>
              </div>

              <!-- Click outside to close -->
              <div
                class="fixed inset-0 z-40"
                onclick={() => showDropdown = false}
              ></div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
