<script lang="ts">
  import { Button } from '@aphex/ui/shadcn/button';
  import * as Card from '@aphex/ui/shadcn/card';
  import type { SchemaType } from '../../types.js';
  import SchemaField from './SchemaField.svelte';

  interface Props {
    open: boolean;
    schema: SchemaType;
    value: Record<string, any>;
    onClose: () => void;
    onSave: (value: Record<string, any>) => void;
    onUpdate?: (value: Record<string, any>) => void; // For real-time updates
    onOpenReference?: (documentId: string, documentType: string) => void;
  }

  let { open, schema, value, onClose, onSave, onUpdate, onOpenReference }: Props = $props();

  // Initialize editing data with defaults and existing values
  function initializeData() {
    const initialData: Record<string, any> = {};

    if (schema?.fields) {
      schema.fields.forEach(field => {
        if (field.type === 'boolean' && 'initialValue' in field) {
          initialData[field.name] = field.initialValue;
        } else {
          initialData[field.name] = '';
        }
      });
    }

    return { ...initialData, ...value };
  }

  // Local state for editing
  let editingData = $state<Record<string, any>>(initializeData());

  function handleSave() {
    onSave(editingData);
    onClose();
  }

  function handleCancel() {
    onClose();
  }

  // Handle backdrop click
  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  // Handle escape key
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    }
  }
</script>

{#if open}
  <!-- Backdrop - relative to parent container -->
  <div
    class="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    role="button"
    tabindex="-1"
  >
    <!-- Modal Content -->
    <Card.Root class="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-lg">
      <Card.Header class="border-b">
        <div class="flex items-center justify-between">
          <div>
            <Card.Title>{schema.title}</Card.Title>
            {#if schema.description}
              <Card.Description>{schema.description}</Card.Description>
            {/if}
          </div>
          <Button variant="ghost" size="icon" onclick={onClose}>
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
      </Card.Header>

      <Card.Content class="flex-1 overflow-auto p-6">
        <div class="space-y-4">
          {#if schema.fields}
            {#each schema.fields as field, index(index)}
              <SchemaField
                {field}
                value={editingData[field.name]}
                documentData={editingData}
                onUpdate={(newValue) => {
                  editingData = { ...editingData, [field.name]: newValue };
                }}
                {onOpenReference}
              />
            {/each}
          {/if}
        </div>
      </Card.Content>

      <Card.Footer class="border-t flex justify-end gap-2">
        <Button variant="outline" onclick={handleCancel}>
          Cancel
        </Button>
        <Button onclick={handleSave}>
          Save Changes
        </Button>
      </Card.Footer>
    </Card.Root>
  </div>
{/if}
