<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import { Alert, AlertDescription } from '$lib/components/ui/alert';
import { Separator } from '$lib/components/ui/separator';
import { invalidate } from '$app/navigation';
import DebugSchemaViewer from '$lib/components/DebugSchemaViewer.svelte';

interface Props {
  data: {
    initialized: boolean;
    error?: string;
    documentTypes: Array<{ name: string; title: string; description?: string }>;
    objectTypes: Array<{ name: string; title: string; description?: string }>;
    allSchemas: Array<any>; // SchemaType[] for debug component
  };
}

let { data }: Props = $props();

// Mock document counts for now (would come from API)
const documentTypesWithCounts = $derived(
  data.documentTypes.map(docType => ({
    ...docType,
    documentCount: 0 // TODO: Get real counts from API
  }))
);

const hasDocumentTypes = $derived(data.documentTypes.length > 0);
const hasObjectTypes = $derived(data.objectTypes.length > 0);
const totalDocuments = $derived(0); // TODO: Calculate from real data

// Schema hot-reloading handled by Vite plugin in vite.config.ts
</script>

<svelte:head>
  <title>Content - TCR CMS</title>
</svelte:head>

<!-- Status Alert -->
{#if !data.initialized}
  <Alert variant="destructive" class="mb-6">
    <AlertDescription>
      CMS initialization failed: {data.error || 'Unknown error'}
    </AlertDescription>
  </Alert>
{/if}

<!-- Main Content Area -->
<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Content</h1>
      <p class="text-muted-foreground">Manage your document types and content</p>
    </div>
  </div>

  <!-- Document Types List - Sanity Style -->
  <div class="space-y-4">
    <div class="flex items-center gap-2">
      <h2 class="text-lg font-medium">Document Types</h2>
      <Badge variant="secondary">{data.documentTypes.length}</Badge>
    </div>

    {#if hasDocumentTypes}
      <div class="space-y-1">
        {#each documentTypesWithCounts as docType}
          <div class="group flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
            <div class="flex items-center gap-3">
              <!-- Document Type Icon -->
              <div class="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-md flex items-center justify-center">
                <span class="text-blue-600 dark:text-blue-400 text-sm">📄</span>
              </div>

              <!-- Content -->
              <div>
                <h3 class="font-medium text-sm">{docType.title}</h3>
                {#if docType.description}
                  <p class="text-xs text-muted-foreground">{docType.description}</p>
                {:else}
                  <p class="text-xs text-muted-foreground">Document type: {docType.name}</p>
                {/if}
              </div>
            </div>

            <!-- Actions & Count -->
            <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Badge variant="outline" class="text-xs">
                {docType.documentCount} document{docType.documentCount !== 1 ? 's' : ''}
              </Badge>
              <Button size="sm" variant="ghost" href="/admin/documents/{docType.name}">
                View
              </Button>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-center py-8 text-muted-foreground">
        <div class="mb-2">📄</div>
        <p class="text-sm">No document types found</p>
        <p class="text-xs">Define schemas in <code>src/lib/schemaTypes/index.ts</code></p>
      </div>
    {/if}
  </div>

  {#if hasObjectTypes}
    <Separator />

    <!-- Object Types List -->
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <h2 class="text-lg font-medium">Object Types</h2>
        <Badge variant="secondary">{data.objectTypes.length}</Badge>
      </div>

      <div class="space-y-1">
        {#each data.objectTypes as objectType}
          <div class="group flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
            <div class="flex items-center gap-3">
              <!-- Object Type Icon -->
              <div class="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-md flex items-center justify-center">
                <span class="text-green-600 dark:text-green-400 text-sm">🧩</span>
              </div>

              <!-- Content -->
              <div>
                <h3 class="font-medium text-sm">{objectType.title}</h3>
                {#if objectType.description}
                  <p class="text-xs text-muted-foreground">{objectType.description}</p>
                {:else}
                  <p class="text-xs text-muted-foreground">Object type: {objectType.name}</p>
                {/if}
              </div>
            </div>

            <!-- Badge -->
            <Badge variant="outline" class="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
              reusable
            </Badge>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Summary Stats -->
  {#if hasDocumentTypes || hasObjectTypes}
    <Separator />
    <div class="flex items-center gap-4 text-sm text-muted-foreground">
      <span>{data.documentTypes.length} document types</span>
      <span>•</span>
      <span>{totalDocuments} total documents</span>
      {#if hasObjectTypes}
        <span>•</span>
        <span>{data.objectTypes.length} object types</span>
      {/if}
    </div>
  {/if}

  <!-- DEBUG: Schema Viewer (uncomment to debug schemas) -->
  {#if data.allSchemas && data.allSchemas.length > 0}
    <Separator />
    <DebugSchemaViewer schemas={data.allSchemas} />
  {/if}
</div>
