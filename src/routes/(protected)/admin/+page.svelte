<script lang="ts">
import { Alert, AlertDescription } from '$lib/components/ui/alert';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { documents, ApiError } from '$lib/api/index.js';

interface Props {
  data: {
    documentTypes: Array<{ name: string; title: string; description?: string }>;
  };
}

let { data } = $props();

const hasDocumentTypes = $derived(data.documentTypes.length > 0);

// Client-side routing state
let currentView = $state<'dashboard' | 'documents'>('dashboard');
let selectedDocumentType = $state<string | null>(null);
let documentsList = $state<any[]>([]);
let loading = $state(false);
let error = $state<string | null>(null);

// Watch URL params for bookmarkable navigation
$effect(() => {
  const url = $page.url;
  const docType = url.searchParams.get('docType');

  if (docType) {
    currentView = 'documents';
    selectedDocumentType = docType;
    fetchDocuments(docType);
  } else {
    currentView = 'dashboard';
    selectedDocumentType = null;
  }
});

async function navigateToDocumentType(docType: string) {
  // Update URL for bookmarkability
  await goto(`/admin?docType=${docType}`, { replaceState: false });
}


async function fetchDocuments(docType: string) {
  loading = true;
  error = null;

  try {
    const response = await documents.getByType(docType, { limit: 50 });

    if (response.success && response.data) {
      documentsList = response.data.map(doc => {
        // Get the appropriate data (draft or published)
        const docData = doc.draftData || doc.publishedData || {};

        return {
          id: doc.id,
          title: docData.title || `Untitled ${doc.type}`,
          status: doc.status,
          publishedAt: doc.publishedAt ? new Date(doc.publishedAt) : null,
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : null,
          createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
          // Check if changes exist in draft vs published
          hasChanges: doc.status === 'published' && doc.draftData !== null &&
                     JSON.stringify(doc.draftData) !== JSON.stringify(doc.publishedData)
        };
      });
    } else {
      throw new Error(response.error || 'Failed to fetch documents');
    }
  } catch (err) {
    console.error('Failed to fetch documents:', err);
    error = err instanceof ApiError ? err.message : 'Failed to load documents';
    documentsList = [];
  } finally {
    loading = false;
  }
}
</script>

<svelte:head>
  <title>Content - TCR CMS</title>
</svelte:head>

<div class="flex h-full">
  <!-- Left Sidebar - Document Types (always visible) -->
  <div class="max-w-[350px] h-full border">
    {#if hasDocumentTypes}
      {#each data.documentTypes as docType, index (index)}
        <button
          onclick={() => navigateToDocumentType(docType.name)}
          class="group flex items-center justify-between p-3 hover:bg-muted/50 transition-colors border-b border-border first:border-t w-full text-left {selectedDocumentType === docType.name ? 'bg-muted/50' : ''}"
        >
          <div class="flex items-center gap-3">
            <!-- Document Type Icon -->
            <div class="w-6 h-6 flex items-center justify-center">
              <span class="text-muted-foreground">📄</span>
            </div>

            <!-- Content -->
            <div>
              <h3 class="font-medium text-sm">{docType.title}</h3>
              {#if docType.description}
                <p class="text-xs text-muted-foreground">{docType.description}</p>
              {/if}
            </div>
          </div>

          <!-- Arrow -->
          <div class="text-muted-foreground group-hover:text-foreground transition-colors">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      {/each}
    {:else}
      <!-- Empty state -->
      <div class="p-6 text-center">
        <div class="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-xl text-muted-foreground">📄</span>
        </div>
        <h3 class="font-medium mb-2">No content types found</h3>
        <p class="text-sm text-muted-foreground mb-4">
          Get started by defining your first schema type
        </p>
        <p class="text-xs text-muted-foreground">
          Add schemas in <code class="bg-muted px-1.5 py-0.5 rounded text-xs">src/lib/schemaTypes/</code>
        </p>
      </div>
    {/if}
  </div>

  <!-- Right Sidebar - Documents List (shows when document type selected) -->
  {#if selectedDocumentType}
    <div class="max-w-[350px] h-full border-l border-r">
      <!-- Header with document type info -->
      <div class="p-3 border-b border-border bg-muted/20">
        <div class="flex items-center gap-3">
          <div class="w-6 h-6 flex items-center justify-center">
            <span class="text-muted-foreground">📄</span>
          </div>
          <div>
            <h3 class="font-medium text-sm">
              {data.documentTypes.find(t => t.name === selectedDocumentType)?.title || selectedDocumentType}
            </h3>
            <p class="text-xs text-muted-foreground">
              {documentsList.length} document{documentsList.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {#if error}
        <!-- Error state -->
        <div class="p-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      {:else if loading}
        <div class="p-3 text-center">
          <div class="text-sm text-muted-foreground">Loading...</div>
        </div>
      {:else if documentsList.length > 0}
        {#each documentsList as doc, index (index)}
          <button
            class="group flex items-center justify-between p-3 hover:bg-muted/50 transition-colors border-b border-border w-full text-left"
          >
            <div class="flex items-center gap-3">
              <!-- Document Icon -->
              <div class="w-6 h-6 flex items-center justify-center">
                <span class="text-muted-foreground">📄</span>
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-sm truncate">{doc.title}</h3>
                {#if doc.slug}
                  <p class="text-xs text-muted-foreground">/{doc.slug}</p>
                {:else if doc.status}
                  <p class="text-xs text-muted-foreground">{doc.status}</p>
                {/if}
              </div>
            </div>

            <!-- Date -->
            <div class="text-xs text-muted-foreground">
              {doc.updatedAt?.toLocaleDateString() || ''}
            </div>
          </button>
        {/each}
      {:else}
        <!-- Empty documents state -->
        <div class="p-6 text-center">
          <div class="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span class="text-xl text-muted-foreground">📄</span>
          </div>
          <h3 class="font-medium mb-2">No documents found</h3>
          <p class="text-sm text-muted-foreground mb-4">
            Create your first {selectedDocumentType} document
          </p>
          <button class="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors">
            Create Document
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>
