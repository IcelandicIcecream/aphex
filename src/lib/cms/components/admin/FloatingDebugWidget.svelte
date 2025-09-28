<script lang="ts">
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import DebugSchemaViewer from '$lib/components/DebugSchemaViewer.svelte';

  interface Props {
    schemas: Array<any>;
  }

  let { schemas }: Props = $props();
</script>

<!-- Floating Debug Widget -->
<div class="fixed bottom-6 right-6 z-50">
  <Dialog.Root>
    <Dialog.Trigger
      class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/95 text-sm font-medium shadow-lg backdrop-blur transition-colors hover:bg-muted supports-[backdrop-filter]:bg-background/60"
    >
      <span class="text-sm">🔍</span>
      <span class="sr-only">Debug Schema</span>
    </Dialog.Trigger>

    <Dialog.Content class="max-w-4xl max-h-[80vh] overflow-y-auto">
      <Dialog.Header>
        <Dialog.Title>Schema Debug Viewer</Dialog.Title>
        <Dialog.Description>
          View and debug your schema types and field definitions.
        </Dialog.Description>
      </Dialog.Header>

      <div class="mt-6">
        {#if schemas && schemas.length > 0}
          <DebugSchemaViewer {schemas} />
        {:else}
          <div class="text-center py-8 text-muted-foreground">
            <div class="text-2xl mb-2">📄</div>
            <p class="text-sm">No schemas available to debug</p>
          </div>
        {/if}
      </div>
    </Dialog.Content>
  </Dialog.Root>
</div>