<script lang="ts">
  import CheckIcon from "@lucide/svelte/icons/check";
  import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import XIcon from "@lucide/svelte/icons/x";
  import { tick } from "svelte";
  import * as Command from "$lib/components/ui/command/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { cn } from "$lib/utils.js";
  import type { Field, ReferenceField as ReferenceFieldType } from '$lib/cms/types';
  import { documents } from '$lib/api/index.js';

  interface Props {
    field: Field;
    value: string | null; // Document ID
    onUpdate: (value: string | null) => void;
  }

  let { field, value, onUpdate }: Props = $props();

  // Cast to reference field type
  const referenceField = field as ReferenceFieldType;
  const targetType = referenceField.to?.[0]?.type;

  // State
  let open = $state(false);
  let searchResults = $state<any[]>([]);
  let selectedDocument = $state<any>(null);
  let loading = $state(false);
  let creating = $state(false);
  let triggerRef = $state<HTMLButtonElement>(null!);

  // Load selected document details when value changes
  $effect(() => {
    async function loadDocument() {
      if (value) {
        try {
          const doc = await documents.getById(value);
          if (doc.success) {
            selectedDocument = doc.data;
          }
        } catch (err) {
          console.error('Failed to load referenced document:', err);
          selectedDocument = null;
        }
      } else {
        selectedDocument = null;
      }
    }
    loadDocument();
  });

  // Load documents when dropdown opens
  $effect(() => {
    async function loadDocuments() {
      if (open && targetType) {
        loading = true;
        try {
          const result = await documents.list({
            docType: targetType,
            limit: 10
          });
          if (result.success && result.data) {
            searchResults = result.data;
          }
        } catch (err) {
          console.error('Failed to load documents:', err);
          searchResults = [];
        } finally {
          loading = false;
        }
      }
    }
    loadDocuments();
  });

  function closeAndFocusTrigger() {
    open = false;
    tick().then(() => {
      triggerRef?.focus();
    });
  }

  function selectDocument(doc: any) {
    onUpdate(doc.id);
    closeAndFocusTrigger();
  }

  function clearSelection() {
    onUpdate(null);
    selectedDocument = null;
  }

  async function createNewDocument() {
    if (!targetType) return;

    creating = true;
    try {
      const result = await documents.create({
        type: targetType,
        draftData: {
          title: 'Untitled',
        }
      });

      if (result.success && result.data) {
        onUpdate(result.data.id);
        closeAndFocusTrigger();
      }
    } catch (err) {
      console.error('Failed to create document:', err);
    } finally {
      creating = false;
    }
  }

  function getDocumentTitle(doc: any): string {
    // Try to get title from draft data first, then published data
    const data = doc.draftData || doc.publishedData || {};
    return data.title || data.name || data.heading || 'Untitled';
  }

  const selectedLabel = $derived(
    selectedDocument ? getDocumentTitle(selectedDocument) : null
  );
</script>

{#if selectedDocument}
  <!-- Selected document display -->
  <div class="flex items-center gap-2 p-3 border border-border rounded-md bg-muted/30">
    <div class="flex-1">
      <div class="font-medium text-sm">{getDocumentTitle(selectedDocument)}</div>
      <div class="text-xs text-muted-foreground">
        {targetType} • {selectedDocument.status === 'published' ? '🟢' : '🟡'} {selectedDocument.status}
      </div>
    </div>
    <Button
      variant="ghost"
      size="sm"
      onclick={clearSelection}
      class="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
    >
      <XIcon class="h-4 w-4" />
    </Button>
  </div>
{:else}
  <!-- Search/select interface -->
  <Popover.Root bind:open>
    <Popover.Trigger bind:ref={triggerRef}>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="outline"
          class="w-full justify-between"
          role="combobox"
          aria-expanded={open}
        >
          {selectedLabel || `Select ${targetType}...`}
          <ChevronsUpDownIcon class="opacity-50" />
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-[400px] p-0">
      <Command.Root>
        <Command.List>
          {#if loading}
            <Command.Loading>Loading...</Command.Loading>
          {:else if searchResults.length === 0}
            <Command.Empty>
              <div class="flex flex-col items-center gap-2 py-4">
                <p class="text-sm text-muted-foreground">
                  No {targetType}s found
                </p>
                <Button
                  size="sm"
                  onclick={createNewDocument}
                  disabled={creating}
                  class="gap-1"
                >
                  <PlusIcon class="h-3 w-3" />
                  {creating ? 'Creating...' : `Create new ${targetType}`}
                </Button>
              </div>
            </Command.Empty>
          {:else if searchResults.length > 0}
            <Command.Group>
              {#each searchResults as doc (doc.id)}
                <Command.Item
                  value={doc.id}
                  onSelect={() => selectDocument(doc)}
                  class="flex items-center justify-between"
                >
                  <div class="flex items-center gap-2">
                    <CheckIcon
                      class={cn("h-4 w-4", value !== doc.id && "text-transparent")}
                    />
                    <div>
                      <div class="font-medium text-sm">{getDocumentTitle(doc)}</div>
                      <div class="text-xs text-muted-foreground">
                        {doc.status === 'published' ? '🟢' : '🟡'} {doc.status}
                      </div>
                    </div>
                  </div>
                </Command.Item>
              {/each}
            </Command.Group>
            <Command.Separator />
            <Command.Group>
              <Command.Item onSelect={createNewDocument} class="justify-center">
                <div class="flex items-center gap-1">
                  <PlusIcon class="h-3 w-3" />
                  {creating ? 'Creating...' : `Create new ${targetType}`}
                </div>
              </Command.Item>
            </Command.Group>
          {:else}
            <Command.Empty>
              No {targetType}s available
            </Command.Empty>
          {/if}
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>
{/if}