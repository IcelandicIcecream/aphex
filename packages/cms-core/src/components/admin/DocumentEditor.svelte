<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { documents, schemas, ApiError } from '$lib/api/index.js';
  import SchemaField from './SchemaField.svelte';
  import { findOrphanedFields, type OrphanedField } from '../../schema-utils/cleanup.js';
  import type { SchemaType } from '../../types.js';
  import { Rule } from '../../field-validation/rule.js';
  import { createContentHash, hasUnpublishedChanges } from '../../content-hash.js';

  interface Props {
    documentType: string;
    documentId?: string | null;
    isCreating: boolean;
    onBack: () => void;
    onSaved?: (documentId: string) => void;
    onAutoSaved?: (documentId: string, title: string) => void;
    onDeleted?: () => void;
    onPublished?: (documentId: string) => void;
  }

  let { documentType, documentId, isCreating, onBack, onSaved, onAutoSaved, onDeleted, onPublished }: Props = $props();

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

  // Schema cleanup state
  let orphanedFields = $state<OrphanedField[]>([]);
  let showOrphanedFields = $state(false);

  // Hash-based state tracking
  const currentDraftHash = $derived(createContentHash(documentData));
  const hasUnpublishedContent = $derived(hasUnpublishedChanges(documentData, fullDocument?.publishedHash || null));
  const canPublish = $derived(hasUnpublishedContent && !saving && documentId);

  // Load schema when documentType is available or when switching to create mode
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

  // Reset to defaults when creating new document
  $effect(() => {
    if (isCreating && schema) {
      resetToDefaults();
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

        // No need to reset here - handled by separate effect
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

  function resetToDefaults() {
    if (!schema) return;

    console.log('🔄 Resetting document data to defaults for new document');

    // Reset document data with field defaults
    const initialData: Record<string, any> = {};
    schema.fields.forEach(field => {
      if (field.type === 'boolean' && 'initialValue' in field) {
        initialData[field.name] = field.initialValue;
      } else {
        initialData[field.name] = '';
      }
    });

    documentData = initialData;
    fullDocument = null;
    hasUnsavedChanges = false;
    lastSaved = null;
    saveError = null;
    console.log('✅ Document data reset to:', initialData);
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

        // Notify parent that document was published
        if (onPublished && documentId) {
          onPublished(documentId);
        }
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

  // Schema cleanup functions
  function removeOrphanedField(fieldToRemove: OrphanedField) {
    // Remove the specific field from document data
    const newData = { ...documentData };

    if (fieldToRemove.level === 'document') {
      delete newData[fieldToRemove.key];
    } else {
      // Handle nested field removal (more complex path-based deletion)
      removeFieldByPath(newData, fieldToRemove.path);
    }

    documentData = newData;
    hasUnsavedChanges = true;

    // Remove from orphaned fields list
    orphanedFields = orphanedFields.filter(f => f !== fieldToRemove);

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

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="flex items-center justify-between p-4 lg:p-4 border-b border-border bg-muted/20">
    <div class="flex items-center gap-3">
      <!-- Back button only on desktop (mobile uses breadcrumbs) -->
      <Button variant="ghost" size="sm" onclick={onBack} class="hidden lg:flex hover:cursor-pointer">
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
      <!-- Orphaned Fields Warning -->
      {#if showOrphanedFields && orphanedFields.length > 0}
        <div class="border border-orange-200 bg-orange-50 rounded-md p-4 space-y-3">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.081 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h4 class="font-medium text-orange-800 text-sm">
              {orphanedFields.length} orphaned field{orphanedFields.length === 1 ? '' : 's'} detected
            </h4>
          </div>

          <p class="text-orange-700 text-sm">
            These fields exist in your document but are no longer defined in the schema:
          </p>

          <div class="space-y-2">
            {#each orphanedFields as field, index(index)}
              <div class="bg-white border border-orange-200 rounded p-3 flex items-center justify-between">
                <div class="flex-1">
                  <div class="font-mono text-sm font-medium text-orange-800">{field.path || field.key}</div>
                  <div class="text-xs text-orange-600 mt-1">
                    <code class="bg-orange-100 px-1 rounded">{JSON.stringify(field.value)}</code>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onclick={() => removeOrphanedField(field)}
                  class="ml-3 h-8 px-3 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                >
                  Remove
                </Button>
              </div>
            {/each}
          </div>

          <div class="flex gap-2 pt-2 border-t border-orange-200">
            <Button
              size="sm"
              variant="outline"
              onclick={cleanupAllOrphanedFields}
              class="bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
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
          documentData={documentData}
          onUpdate={(newValue) => {
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
            <Button
              onclick={() => showDropdown = !showDropdown}
              variant="ghost"
              class="flex items-center justify-center w-8 h-8 rounded hover:bg-muted transition-colors"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01" />
              </svg>
            </Button>

            {#if showDropdown}
              <!-- Dropdown menu -->
              <div class="absolute bottom-full right-0 mb-2 bg-background border border-border rounded-md shadow-lg py-1 min-w-[140px] z-50">
                <Button
                  variant="ghost"
                  onclick={() => {
                    showDropdown = false;
                    deleteDocument();
                  }}
                  class="w-full px-3 py-2 text-left text-sm hover:bg-muted text-destructive transition-colors flex items-center gap-2"
                >
                  Delete document
                </Button>
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
