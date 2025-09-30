<script lang="ts">
  import { Textarea } from '$lib/components/ui/textarea';
  import type { Field } from '../../../types.js';
  import { validateField, getValidationClasses, type ValidationError } from '../../../field-validation/utils.js';

  interface Props {
    field: Field;
    value: any;
    onUpdate: (value: any) => void;
  }

  let { field, value, onUpdate }: Props = $props();

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
    const target = event.target as HTMLTextAreaElement;
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

  // Computed values
  const hasErrors = $derived(validationErrors.filter(e => e.level === 'error').length > 0);
  const validationClasses = $derived(getValidationClasses(hasValidated, isValid, hasErrors));
</script>

<Textarea
  id={field.name}
  value={value || ''}
  placeholder={field.title}
  oninput={handleInputChange}
  onblur={handleBlur}
  onfocus={handleFocus}
  class="min-h-[100px] {validationClasses}"
/>