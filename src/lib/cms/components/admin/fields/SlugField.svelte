<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import type { Field } from '$lib/cms/types';
  import { isFieldRequired, validateField, getValidationClasses, type ValidationError } from '$lib/cms/field-validation/utils.js';
  import { generateSlug } from '$lib/utils/slug.js';

  interface Props {
    field: Field;
    value: any;
    documentData?: Record<string, any>;
    onUpdate: (value: any) => void;
  }

  let { field, value, documentData, onUpdate }: Props = $props();

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

  function handleInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    onUpdate(target.value);
  }

  // Validation triggers
  function handleBlur() {
    if (!hasValidated) {
      performValidation(value);
    }
  }

  function handleFocus() {
    // Could add focus styling here
  }

  // Generate slug from title
  function generateSlugFromTitle() {
    if (documentData?.title) {
      const generatedSlug = generateSlug(documentData.title);
      onUpdate(generatedSlug);
    }
  }

  // Computed values
  const hasErrors = $derived(validationErrors.filter(e => e.level === 'error').length > 0);
  const validationClasses = $derived(getValidationClasses(hasValidated, isValid, hasErrors));
</script>

<div class="space-y-2">
  <div class="flex gap-2">
    <Input
      id={field.name}
      value={value || ''}
      placeholder="document-slug"
      oninput={handleInputChange}
      onblur={handleBlur}
      onfocus={handleFocus}
      class="flex-1 {validationClasses}"
    />
    <Button
      variant="outline"
      size="sm"
      onclick={generateSlugFromTitle}
      disabled={!documentData?.title}
      class="shrink-0"
    >
      Generate from Title
    </Button>
  </div>
  {#if documentData?.title}
    <p class="text-xs text-muted-foreground">
      Click "Generate from Title" to create slug from: "{documentData.title}"
    </p>
  {:else}
    <p class="text-xs text-muted-foreground">
      Enter a title first to generate a slug automatically
    </p>
  {/if}
</div>