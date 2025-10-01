<script lang="ts">
  import { Input } from '../../ui/input';
  import type { Field } from '../../../types.js';
  import { validateField, getValidationClasses, type ValidationError } from '../../../field-validation/utils.js';

  interface Props {
    field: Field;
    value: number | null;
    onUpdate: (value: number | null) => void;
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

  // Convert value to string for input, handle null/undefined
  let inputValue = $derived(value?.toString() || '');

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const newValue = target.value;

    // Convert to number and update
    if (newValue === '') {
      onUpdate(null);
    } else {
      const numValue = parseFloat(newValue);
      if (!isNaN(numValue)) {
        onUpdate(numValue);
      }
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].includes(event.keyCode) ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (event.keyCode === 65 && event.ctrlKey) ||
        (event.keyCode === 67 && event.ctrlKey) ||
        (event.keyCode === 86 && event.ctrlKey) ||
        (event.keyCode === 88 && event.ctrlKey) ||
        // Allow: home, end, left, right
        (event.keyCode >= 35 && event.keyCode <= 39)) {
      return;
    }

    // Ensure that it's a number or decimal point and stop the keypress
    if ((event.shiftKey || (event.keyCode < 48 || event.keyCode > 57)) &&
        (event.keyCode < 96 || event.keyCode > 105) &&
        event.keyCode !== 190 && event.keyCode !== 110) {
      event.preventDefault();
    }
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

<Input
  id={field.name}
  type="number"
  step="any"
  placeholder={field.description || `Enter ${field.title?.toLowerCase() || 'number'}`}
  value={inputValue}
  oninput={handleInput}
  onkeydown={handleKeydown}
  onblur={handleBlur}
  onfocus={handleFocus}
  class={validationClasses}
/>
