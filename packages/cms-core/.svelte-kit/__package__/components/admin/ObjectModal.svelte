<script lang="ts">
  import { Button } from '@aphex/ui/shadcn/button';
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@aphex/ui/shadcn/dialog';
  import type { SchemaType } from '../../types.js';
  import SchemaField from './SchemaField.svelte';

  interface Props {
    open: boolean;
    schema: SchemaType;
    value: Record<string, any>;
    onClose: () => void;
    onSave: (value: Record<string, any>) => void;
    onUpdate?: (value: Record<string, any>) => void; // For real-time updates
  }

  let { open, schema, value, onClose, onSave, onUpdate }: Props = $props();

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
</script>

<Dialog {open}>
  <DialogContent class="max-w-2xl max-h-[90vh] overflow-auto">
    <DialogHeader>
      <DialogTitle>Edit {schema.title}</DialogTitle>
      {#if schema.description}
        <p class="text-sm text-muted-foreground">{schema.description}</p>
      {/if}
    </DialogHeader>

    <div class="space-y-4 py-4">
      {#if schema.fields}
        {#each schema.fields as field, index(index)}
          <SchemaField
            {field}
            value={editingData[field.name]}
            documentData={editingData}
            onUpdate={(newValue) => {
              editingData = { ...editingData, [field.name]: newValue };
            }}
          />
        {/each}
      {/if}
    </div>

    <DialogFooter>
      <Button variant="outline" onclick={handleCancel}>
        Cancel
      </Button>
      <Button onclick={handleSave}>
        Save Changes
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
