<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import { documents, schemas, ApiError } from '$lib/api/index.js';
  import SchemaField from './SchemaField.svelte';
  import type { SchemaType } from '$lib/cms/types';

  interface Props {
    documentType: string;
    documentId?: string | null;
    isCreating: boolean;
    onBack: () => void;
    onSaved?: (documentId: string) => void;
  }

  let { documentType, documentId, isCreating, onBack, onSaved }: Props = $props();

  // Schema and document state
  let schema = $state<SchemaType | null>(null);
  let schemaLoading = $state(false);
  let schemaError = $state<string | null>(null);

  // Document data state
  let documentData = $state<Record<string, any>>({});
  let saving = $state(false);
  let saveError = $state<string | null>(null);
  let lastSaved = $state<Date | null>(null);

  // Auto-save functionality (every 2 seconds when there are changes)
  let hasUnsavedChanges = $state(false);
  let autoSaveTimer: number | null = null;

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
        // Load the draft data if available, otherwise published data
        const data = response.data.draftData || response.data.publishedData || {};
        console.log('📄 Loaded document data:', data);

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

  // Watch for changes to trigger auto-save (debounced)
  $effect(() => {
    // Track changes to documentData specifically
    const dataString = JSON.stringify(documentData);

    // Only set hasUnsavedChanges if we actually have data
    if (Object.keys(documentData).length > 0) {
      hasUnsavedChanges = true;
    }

    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Debounced auto-save - waits for 800ms pause in typing (like Notion/modern apps)
    if (Object.keys(documentData).length > 0 && schema) {
      autoSaveTimer = setTimeout(() => {
        console.log('🔄 Auto-saving after typing pause...', { isCreating, documentId });
        saveDocument(true); // auto-save
      }, 800); // Shorter delay - saves faster but still waits for typing pauses
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
          // Switch to edit mode
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

      if (response.success) {
        lastSaved = new Date();
        console.log('✅ Document published successfully');
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

  // Auto-generate slug from title
  $effect(() => {
    if (documentData.title && !documentData.slug) {
      documentData.slug = documentData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  });
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="flex items-center justify-between p-4 border-b border-border bg-muted/20">
    <div class="flex items-center gap-3">
      <Button variant="ghost" size="sm" onclick={onBack}>
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Button>

      <div>
        <h3 class="font-medium text-sm">
          {isCreating ? `New ${documentType}` : `Edit ${documentType}`}
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
      {:else if hasUnsavedChanges}
        <Badge variant="outline">Unsaved</Badge>
      {:else if lastSaved}
        <Badge variant="secondary">Saved</Badge>
      {/if}


      {#if !isCreating && documentId}
        <Button
          onclick={publishDocument}
          disabled={saving}
          size="sm"
          variant="default"
        >
          Publish
        </Button>
      {/if}
    </div>
  </div>

  <!-- Content Form -->
  <div class="flex-1 overflow-auto p-6 space-y-6">
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
</div>
