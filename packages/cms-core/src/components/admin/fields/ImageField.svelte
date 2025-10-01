<script lang="ts">
  import { Button } from '../../ui/button';
  import { Trash2, Upload, Image as ImageIcon, FileImage } from 'lucide-svelte';
  import type { ImageField as ImageFieldType, ImageValue } from '../../../types.js';
  import { validateField, getValidationClasses, type ValidationError } from '../../../field-validation/utils.js';

  interface Props {
    field: ImageFieldType;
    value: ImageValue | null;
    onUpdate: (value: ImageValue | null) => void;
  }

  let { field, value, onUpdate }: Props = $props();


  // Component state
  let isDragging = $state(false);
  let isUploading = $state(false);
  let uploadError = $state<string | null>(null);
  let fileInputRef: HTMLInputElement;

  // Validation state
  let validationErrors = $state<ValidationError[]>([]);
  let isValid = $state(false);
  let hasValidated = $state(false);

  // Real-time validation
  async function performValidation(currentValue: any, context: any = {}) {
    const result = await validateField(field, currentValue, context);
    validationErrors = result.errors;
    isValid = result.isValid;
    hasValidated = true;
  }

  // Validate on value change (but only after first blur)
  $effect(() => {
    if (hasValidated) {
      performValidation(value);
    }
  });

  // Upload file to server
  async function uploadFile(file: File): Promise<ImageValue | null> {
    isUploading = true;
    uploadError = null;

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/assets', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();

      // Extract asset from response (API returns { success: true, data: asset })
      const asset = result.success ? result.data : result;

      // Return Sanity-style image value
      return {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: asset.id || asset._id
        }
      };
    } catch (error) {
      uploadError = error instanceof Error ? error.message : 'Upload failed';
      return null;
    } finally {
      isUploading = false;
    }
  }

  // Handle file selection
  async function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    const allowedTypes = field.accept || 'image/*';
    if (!file.type.startsWith('image/')) {
      uploadError = 'Please select an image file';
      return;
    }

    const imageValue = await uploadFile(file);
    if (imageValue) {
      onUpdate(imageValue);
      if (!hasValidated) {
        performValidation(imageValue);
      }
    }
  }

  // Drag and drop handlers
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    handleFileSelect(event.dataTransfer?.files || null);
  }

  // File input handlers
  function handleFileInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    handleFileSelect(target.files);
  }

  function openFileDialog() {
    fileInputRef?.click();
  }

  // Remove image
  function removeImage() {
    onUpdate(null);
    uploadError = null;
    if (!hasValidated) {
      performValidation(null);
    }
  }

  // Validation triggers
  function handleBlur() {
    if (!hasValidated) {
      performValidation(value);
    }
  }

  // Computed values
  const hasErrors = $derived(validationErrors.filter(e => e.level === 'error').length > 0);
  const validationClasses = $derived(getValidationClasses(hasValidated, isValid, hasErrors));

  // Asset data state
  let assetData = $state<any>(null);
  let loadingAsset = $state(false);

  // Fetch asset details when asset reference changes
  $effect(() => {
    async function loadAsset() {
      if (value?.asset?._ref) {
        loadingAsset = true;
        try {
          const response = await fetch(`/api/assets/${value.asset._ref}`);
          if (response.ok) {
            assetData = await response.json();
          } else {
            console.error('Failed to fetch asset details');
            assetData = null;
          }
        } catch (error) {
          console.error('Error fetching asset:', error);
          assetData = null;
        } finally {
          loadingAsset = false;
        }
      } else {
        assetData = null;
      }
    }
    loadAsset();
  });

  // Get asset URL for preview
  const previewUrl = $derived(assetData?.url || null);
</script>

<!-- Hidden file input -->
<input
  bind:this={fileInputRef}
  type="file"
  accept={field.accept || 'image/*'}
  style="display: none"
  onchange={handleFileInputChange}
/>

{#if value && value.asset}
  <!-- Image preview with controls -->
  <div class="border border-border rounded-md overflow-hidden {validationClasses}">
    <div class="relative group">
      <!-- Image preview (Sanity-style aspect ratio ~2.75:1) -->
      <div class="bg-muted flex items-center justify-center" style="aspect-ratio: 2.75 / 1;">
        {#if loadingAsset}
          <div class="flex flex-col items-center gap-2 text-muted-foreground">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span class="text-sm">Loading image...</span>
          </div>
        {:else if previewUrl}
          <img
            src={previewUrl}
            alt={assetData?.alt || 'Uploaded image'}
            class="w-full h-full object-contain"
            loading="lazy"
          />
        {:else}
          <div class="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon size={32} />
            <span class="text-sm">Image: {value.asset._ref}</span>
            <span class="text-xs">Failed to load preview</span>
          </div>
        {/if}
      </div>

      <!-- Overlay controls -->
      <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onclick={openFileDialog}
          disabled={isUploading}
        >
          <Upload size={16} class="mr-1" />
          Replace
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onclick={removeImage}
          disabled={isUploading}
        >
          <Trash2 size={16} class="mr-1" />
          Remove
        </Button>
      </div>
    </div>

    <!-- Additional image controls/metadata could go here -->
    {#if field.fields}
      <div class="p-3 border-t border-border space-y-2">
        <!-- Custom fields like caption, alt text, etc. would be rendered here -->
        <p class="text-xs text-muted-foreground">Custom fields coming soon...</p>
      </div>
    {/if}
  </div>

{:else}
  <!-- Sanity-style upload bar -->
  <div class="border border-border rounded-md overflow-hidden {validationClasses}">
    <div class="flex items-center">
      <!-- Drag and drop area (left side) -->
      <div
        class="flex-1 px-4 py-3 transition-colors {isDragging ? 'bg-primary/5' : 'hover:bg-muted/50'}"
        ondragover={handleDragOver}
        ondragleave={handleDragLeave}
        ondrop={handleDrop}
        onblur={handleBlur}
        tabindex="0"
        role="button"
      >
        {#if isUploading}
          <div class="flex items-center gap-3">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
            <span class="text-sm text-muted-foreground">Uploading...</span>
          </div>
        {:else}
          <div class="flex items-center gap-3">
            <FileImage size={20} class="text-muted-foreground" />
            <span class="text-sm text-muted-foreground">
              {isDragging ? 'Drop image here' : 'Drag or paste image here'}
            </span>
          </div>
        {/if}
      </div>

      <!-- Buttons (right side) -->
      <div class="flex items-center gap-2 px-3 py-2 border-l border-border bg-muted/20">
        <Button
          variant="outline"
          size="sm"
          onclick={openFileDialog}
          disabled={isUploading}
          type="button"
        >
          <Upload size={16} class="mr-1" />
          Upload
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={isUploading}
          type="button"
          onclick={() => {
            // TODO: Open asset browser/selector
            console.log('Open asset selector');
          }}
        >
          <ImageIcon size={16} class="mr-1" />
          Select
        </Button>
      </div>
    </div>
  </div>
{/if}

<!-- Error display -->
{#if uploadError}
  <p class="text-sm text-destructive mt-2">{uploadError}</p>
{/if}

<!-- Validation errors -->
{#if hasValidated && validationErrors.length > 0}
  <div class="space-y-1 mt-2">
    {#each validationErrors as error}
      <p class="text-xs {error.level === 'error' ? 'text-destructive' : error.level === 'warning' ? 'text-orange-600' : 'text-blue-600'}">
        {error.message}
      </p>
    {/each}
  </div>
{/if}
