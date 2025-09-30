<script lang="ts">
  import { Label } from '$lib/components/ui/label';
  import { Badge } from '$lib/components/ui/badge';
  import { Input } from '$lib/components/ui/input';
  import type { Field } from '$lib/cms/types';
  import { isFieldRequired, validateField, type ValidationError } from '$lib/cms/field-validation/utils.js';

  // Import individual field components
  import StringField from './fields/StringField.svelte';
  import SlugField from './fields/SlugField.svelte';
  import TextareaField from './fields/TextareaField.svelte';
  import NumberField from './fields/NumberField.svelte';
  import BooleanField from './fields/BooleanField.svelte';
  import ImageField from './fields/ImageField.svelte';
  import ArrayField from './fields/ArrayField.svelte';
  import ReferenceField from './fields/ReferenceField.svelte';
  import SchemaField from './SchemaField.svelte';

  interface Props {
    field: Field;
    value: any;
    documentData?: Record<string, any>;
    onUpdate: (value: any) => void;
  }

  let { field, value, documentData, onUpdate }: Props = $props();

  // Validation state for the wrapper (displays errors and status)
  let validationErrors = $state<ValidationError[]>([]);
  let isValid = $state(false);
  let hasValidated = $state(false);

  // Real-time validation for wrapper display
  async function performValidation(currentValue: any, context: any = {}) {
    const result = await validateField(field, currentValue, context);
    validationErrors = result.errors;
    isValid = result.isValid;
    hasValidated = true;
  }

  // Validate on value change (but only after first interaction)
  $effect(() => {
    if (hasValidated) {
      performValidation(value);
    }
  });


  // Trigger validation on first interaction with complex fields
  function handleComplexFieldInteraction() {
    if (!hasValidated) {
      performValidation(value);
    }
  }

  // Computed values
  const hasErrors = $derived(validationErrors.filter(e => e.level === 'error').length > 0);
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
      {#if hasValidated && hasErrors}
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

  <!-- Validation errors display -->
  {#if hasValidated && validationErrors.length > 0}
    <div class="space-y-1">
      {#each validationErrors as error}
        <p class="text-xs {error.level === 'error' ? 'text-destructive' : error.level === 'warning' ? 'text-orange-600' : 'text-blue-600'}">
          {error.message}
        </p>
      {/each}
    </div>
  {/if}

  <!-- Field type routing to individual components -->
  {#if field.type === 'string'}
    <StringField
      {field}
      {value}
      {documentData}
      {onUpdate}
    />

  {:else if field.type === 'text'}
    <TextareaField
      {field}
      {value}
      {documentData}
      {onUpdate}
    />

  {:else if field.type === 'slug'}
    <SlugField
      {field}
      {value}
      {documentData}
      {onUpdate}
    />

  {:else if field.type === 'number'}
    <NumberField
      {field}
      {value}
      {onUpdate}
    />

  {:else if field.type === 'boolean'}
    <BooleanField
      {field}
      {value}
      {documentData}
      {onUpdate}
    />

  <!-- Image Field -->
  {:else if field.type === 'image'}
    <ImageField
      {field}
      {value}
      {documentData}
      {onUpdate}
    />

  <!-- Object Field -->
  {:else if field.type === 'object' && field.fields}
    <div class="border border-border rounded-md p-4 space-y-4" onclick={handleComplexFieldInteraction}>
      <h4 class="font-medium text-sm">{field.title}</h4>
      {#each field.fields as subField, index (index)}
        <SchemaField
          field={subField}
          value={value?.[subField.name]}
          {documentData}
          onUpdate={(subValue) => onUpdate({ ...value, [subField.name]: subValue })}
        />
      {/each}
    </div>

  <!-- Array Field -->
  {:else if field.type === 'array' && field.of}
    <ArrayField
      {field}
      {value}
      {onUpdate}
    />

  <!-- Reference Field -->
  {:else if field.type === 'reference' && field.to}
    <ReferenceField
      {field}
      {value}
      {onUpdate}
    />

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
