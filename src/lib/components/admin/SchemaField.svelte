<script lang="ts">
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Label } from '$lib/components/ui/label';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import type { Field } from '$lib/cms/types';
  import { Rule } from '$lib/validation/Rule.js';
  import SchemaField from './SchemaField.svelte';

  interface Props {
    field: Field;
    value: any;
    onUpdate: (value: any) => void;
  }

  let { field, value, onUpdate }: Props = $props();

  // Helper to check if field is required
  function isFieldRequired(field: Field): boolean {
    if (!field.validation) return false;
    try {
      const rule = field.validation(new Rule());
      return rule.isRequired();
    } catch {
      return false;
    }
  }

  // Validation state
  let validationErrors = $state<Array<{level: 'error' | 'warning' | 'info', message: string}>>([]);
  let isValid = $state(false);
  let hasValidated = $state(false);

  // Auto-generate slug from source field
  $effect(() => {
    if (field.type === 'slug' && field.source && !value) {
      // This would need to watch the source field value
      // For now, we'll handle this in the parent component
    }
  });

  // Real-time validation (Sanity-style)
  async function validateField(currentValue: any, context: any = {}) {
    if (!field.validation) {
      isValid = true;
      validationErrors = [];
      return;
    }

    try {
      const validationFunctions = Array.isArray(field.validation) ? field.validation : [field.validation];
      const allErrors: Array<{level: 'error' | 'warning' | 'info', message: string}> = [];

      for (const validationFn of validationFunctions) {
        const rule = validationFn(new Rule());
        const markers = await rule.validate(currentValue, { path: [field.name], ...context });

        allErrors.push(...markers.map(marker => ({
          level: marker.level,
          message: marker.message
        })));
      }

      validationErrors = allErrors;
      isValid = allErrors.filter(e => e.level === 'error').length === 0;
      hasValidated = true;
    } catch (error) {
      console.error('Validation error:', error);
      validationErrors = [{ level: 'error', message: 'Validation failed' }];
      isValid = false;
      hasValidated = true;
    }
  }

  // Validate on value change (but only after first blur - Sanity UX pattern)
  $effect(() => {
    if (hasValidated) {
      validateField(value);
    }
  });

  function handleInputChange(event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    onUpdate(target.value);
  }

  function handleBooleanChange(event: Event) {
    const target = event.target as HTMLInputElement;
    onUpdate(target.checked);
  }

  // Sanity-style validation triggers
  function handleBlur() {
    // First validation happens on blur
    if (!hasValidated) {
      validateField(value);
    }
  }

  function handleFocus() {
    // Could add focus styling here
  }

  function handleArrayAdd() {
    const currentArray = Array.isArray(value) ? value : [];
    onUpdate([...currentArray, {}]);
  }

  function handleArrayRemove(index: number) {
    const currentArray = Array.isArray(value) ? value : [];
    onUpdate(currentArray.filter((_, i) => i !== index));
  }

  function handleArrayItemUpdate(index: number, itemValue: any) {
    const currentArray = Array.isArray(value) ? value : [];
    const newArray = [...currentArray];
    newArray[index] = itemValue;
    onUpdate(newArray);
  }
</script>

<div class="space-y-2">
  <div class="flex items-center justify-between">
    <Label for={field.name}>
      {field.title}
      {#if isFieldRequired(field)}
        <span class="text-destructive">*</span>
      {/if}
      {#if hasValidated && isValid}
        <span class="text-green-600 ml-1">✓</span>
      {/if}
    </Label>

    <div class="flex items-center gap-2">
      {#if hasValidated && validationErrors.filter(e => e.level === 'error').length > 0}
        <span class="text-destructive text-sm">🚨</span>
      {/if}

      {#if field.type}
        <Badge variant="outline" class="text-xs">
          {field.type}
        </Badge>
      {/if}
    </div>
  </div>

  {#if field.description}
    <p class="text-sm text-muted-foreground">{field.description}</p>
  {/if}

  <!-- String Field -->
  {#if field.type === 'string'}
    <Input
      id={field.name}
      value={value || ''}
      placeholder={field.title}
      oninput={handleInputChange}
      onblur={handleBlur}
      onfocus={handleFocus}
      class={hasValidated && validationErrors.filter(e => e.level === 'error').length > 0 ? 'border-destructive border-2' : hasValidated && isValid ? 'border-green-500 border-2' : ''}
    />

  <!-- Text Field -->
  {:else if field.type === 'text'}
    <Textarea
      id={field.name}
      value={value || ''}
      placeholder={field.title}
      oninput={handleInputChange}
      onblur={handleBlur}
      onfocus={handleFocus}
      class="min-h-[100px] {hasValidated && validationErrors.filter(e => e.level === 'error').length > 0 ? 'border-destructive border-2' : hasValidated && isValid ? 'border-green-500 border-2' : ''}"
    />

  <!-- Slug Field -->
  {:else if field.type === 'slug'}
    <div class="space-y-2">
      <Input
        id={field.name}
        value={value || ''}
        placeholder="document-slug"
        oninput={handleInputChange}
        class={hasValidated && validationErrors.filter(e => e.level === 'error').length > 0 ? 'border-destructive border-2' : hasValidated && isValid ? 'border-green-500 border-2' : ''}
      />
      {#if field.source}
        <p class="text-xs text-muted-foreground">
          Auto-generated from {field.source}
        </p>
      {/if}
    </div>

  <!-- Boolean Field -->
  {:else if field.type === 'boolean'}
    <div class="flex items-center space-x-2">
      <input
        id={field.name}
        type="checkbox"
        checked={value || false}
        onchange={handleBooleanChange}
        class="w-4 h-4 rounded border border-input"
      />
      <Label for={field.name} class="text-sm font-normal">
        {field.title}
      </Label>
    </div>

  <!-- Object Field -->
  {:else if field.type === 'object' && field.fields}
    <div class="border border-border rounded-md p-4 space-y-4">
      <h4 class="font-medium text-sm">{field.title}</h4>
      {#each field.fields as subField, index (index)}
        <SchemaField
          field={subField}
          value={value?.[subField.name]}
          onUpdate={(subValue) => onUpdate({ ...value, [subField.name]: subValue })}
        />
      {/each}
    </div>

  <!-- Array Field -->
  {:else if field.type === 'array' && field.of}
    <div class="border border-border rounded-md p-4 space-y-4">
      <div class="flex items-center justify-between">
        <h4 class="font-medium text-sm">{field.title}</h4>
        <Button
          variant="outline"
          size="sm"
          onclick={handleArrayAdd}
        >
          Add Item
        </Button>
      </div>

      {#if Array.isArray(value) && value.length > 0}
        {#each value as item, index (index)}
          <div class="border border-border/50 rounded p-3 space-y-2">
            <div class="flex items-center justify-between">
              <h5 class="text-sm font-medium">Item {index + 1}</h5>
              <Button
                variant="ghost"
                size="sm"
                onclick={() => handleArrayRemove(index)}
                class="text-destructive hover:text-destructive"
              >
                Remove
              </Button>
            </div>

            <!-- For now, render as simple object -->
            <!-- TODO: Handle array.of types properly -->
            <div class="pl-4 space-y-2">
              <Input
                placeholder="Item content..."
                value={typeof item === 'string' ? item : JSON.stringify(item)}
                oninput={(e) => {
                  const target = e.target as HTMLInputElement;
                  try {
                    const parsed = JSON.parse(target.value);
                    handleArrayItemUpdate(index, parsed);
                  } catch {
                    handleArrayItemUpdate(index, target.value);
                  }
                }}
              />
            </div>
          </div>
        {/each}
      {:else}
        <div class="text-center py-4 text-muted-foreground">
          <p class="text-sm">No items yet</p>
        </div>
      {/if}
    </div>

  <!-- Unknown field type -->
  {:else}
    <div class="border border-dashed border-muted-foreground/30 rounded-md p-4 text-center">
      <p class="text-sm text-muted-foreground">
        Field type "{field.type}" not yet supported
      </p>
      <p class="text-xs text-muted-foreground mt-1">
        Raw value: {JSON.stringify(value)}
      </p>
    </div>
  {/if}

</div>
