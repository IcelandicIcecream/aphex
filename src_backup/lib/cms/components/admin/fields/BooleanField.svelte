<script lang="ts">
  import { Label } from '$lib/components/ui/label';
  import type { Field } from '$lib/cms/types';
  import { validateField, getValidationClasses, type ValidationError } from '$lib/cms/field-validation/utils.js';

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

  function handleBooleanChange(event: Event) {
    const target = event.target as HTMLInputElement;
    onUpdate(target.checked);
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
</script>

<div class="flex items-center space-x-2">
  <input
    id={field.name}
    type="checkbox"
    checked={value || false}
    onchange={handleBooleanChange}
    onblur={handleBlur}
    class="w-4 h-4 rounded border border-input {validationClasses}"
  />
  <Label for={field.name} class="text-sm font-normal">
    {field.title}
  </Label>
</div>