<script lang="ts">
import { Alert, AlertDescription } from '$lib/components/ui/alert';
import { Button } from '$lib/components/ui/button';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { documents, ApiError } from '$lib/api/index.js';
import DocumentEditor from '$lib/components/admin/DocumentEditor.svelte';
import { resolve } from '$app/paths';
import { SvelteURLSearchParams } from 'svelte/reactivity';

let { data } = $props();

const hasDocumentTypes = $derived(data.documentTypes.length > 0);

// Client-side routing state
let currentView = $state<'dashboard' | 'documents' | 'editor'>('dashboard');
let selectedDocumentType = $state<string | null>(null);
let documentsList = $state<any[]>([]);
let loading = $state(false);
let error = $state<string | null>(null);

// Mobile navigation state (Sanity-style)
let mobileView = $state<'types' | 'documents' | 'editor'>('types');

// Document editor state
let editingDocumentId = $state<string | null>(null);
let isCreatingDocument = $state(false);

// Watch URL params for bookmarkable navigation
$effect(() => {
  const url = $page.url;
  const docType = url.searchParams.get('docType');
  const action = url.searchParams.get('action');
  const docId = url.searchParams.get('docId');

  if (action === 'create' && docType) {
    currentView = 'editor';
    mobileView = 'editor';
    selectedDocumentType = docType;
    isCreatingDocument = true;
    editingDocumentId = null;
  } else if (docId) {
    currentView = 'editor';
    mobileView = 'editor';
    editingDocumentId = docId;
    isCreatingDocument = false;
    // Fetch document to get its type
    fetchDocumentForEditing(docId);
  } else if (docType) {
    currentView = 'documents';
    mobileView = 'documents';
    selectedDocumentType = docType;
    editingDocumentId = null;
    isCreatingDocument = false;
    fetchDocuments(docType);
  } else {
    currentView = 'dashboard';
    mobileView = 'types';
    selectedDocumentType = null;
    editingDocumentId = null;
    isCreatingDocument = false;
  }
});

async function navigateToDocumentType(docType: string) {
  // Update URL for bookmarkability
  await goto(`/admin?docType=${docType}`, { replaceState: false });
  // On mobile, navigate to documents view
  mobileView = 'documents';
}

async function navigateToCreateDocument(docType: string) {
  await goto(`/admin?docType=${docType}&action=create`, { replaceState: false });
  // On mobile, navigate to editor view
  mobileView = 'editor';
}

async function navigateToEditDocument(docId: string, docType?: string) {
  const params = new SvelteURLSearchParams({ docId });
  if (docType) params.set('docType', docType);
  await goto(`/admin?${params.toString()}`, { replaceState: false });
  // On mobile, navigate to editor view
  mobileView = 'editor';
}

async function navigateBack() {
  if (selectedDocumentType) {
    await goto(`/admin?docType=${selectedDocumentType}`, { replaceState: false });
  } else {
    await goto(resolve('/admin'), { replaceState: false });
  }
}

function handleAutoSave(documentId: string, title: string) {
  // Update the title in the documents list for the autosaved document
  if (documentsList.length > 0) {
    documentsList = documentsList.map(doc =>
      doc.id === documentId
        ? { ...doc, title: title }
        : doc
    );
  }
}



async function fetchDocumentForEditing(docId: string) {
  loading = true;
  error = null;

  try {
    const response = await documents.getById(docId);

    if (response.success && response.data) {
      // Set the document type so the editor can load the correct schema
      selectedDocumentType = response.data.type;

      // Also fetch the documents list to show context in sidebar
      await fetchDocuments(response.data.type);
    } else {
      throw new Error(response.error || 'Failed to fetch document');
    }
  } catch (err) {
    console.error('Failed to fetch document:', err);
    error = err instanceof ApiError ? err.message : 'Failed to load document';
    // Navigate back to dashboard on error
    await goto('/admin', { replaceState: true });
  } finally {
    loading = false;
  }
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
          title: docData.title || `Untitled`, // ignore this type error :()
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

<!-- Sanity-style breadcrumb navigation (mobile) -->
<div class="lg:hidden border-b border-border bg-background">
  <div class="flex items-center h-12 px-4">
    {#if mobileView === 'documents' && selectedDocumentType}
      <button
        onclick={async () => {
          mobileView = 'types';
          await goto('/admin', { replaceState: false });
        }}
        class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Content
      </button>
      <span class="mx-2 text-muted-foreground">/</span>
      <span class="text-sm font-medium">
        {data.documentTypes.find(t => t.name === selectedDocumentType)?.title || selectedDocumentType}
      </span>
    {:else if mobileView === 'editor'}
      <button
        onclick={async () => {
          if (selectedDocumentType) {
            mobileView = 'documents';
            await goto(`/admin?docType=${selectedDocumentType}`, { replaceState: false });
          } else {
            mobileView = 'types';
            await goto('/admin', { replaceState: false });
          }
        }}
        class="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        {selectedDocumentType ? (data.documentTypes.find(t => t.name === selectedDocumentType)?.title || selectedDocumentType) : 'Content Types'}
      </button>
      {#if selectedDocumentType}
        <span class="mx-2 text-muted-foreground">/</span>
        <span class="text-sm text-muted-foreground">
          {isCreatingDocument ? 'New Document' : 'Edit Document'}
        </span>
      {/if}
    {:else}
      <span class="text-sm font-medium">Content</span>
    {/if}
  </div>
</div>

<div class="flex h-full lg:h-[calc(100%-3rem)]">
  <!-- Left Sidebar - Document Types -->
  <div class="w-full lg:w-[350px] h-full border-r lg:block {mobileView === 'types' ? 'block' : 'hidden'}">
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
    <div class="w-full lg:w-[350px] h-full border-l border-r lg:block {mobileView === 'documents' ? 'block' : 'hidden'}">
      <!-- Header with document type info -->
      <div class="p-3 border-b border-border bg-muted/20">
        <div class="flex items-center justify-between">
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

          <!-- Create document button -->
          <Button
            size="sm"
            variant="ghost"
            onclick={() => navigateToCreateDocument(selectedDocumentType!)}
            class="h-8 w-8 p-0"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </Button>
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
            onclick={() => navigateToEditDocument(doc.id, selectedDocumentType!)}
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
          <p class="text-sm text-muted-foreground">
            Create your first {selectedDocumentType} document using the + button above
          </p>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Document Editor Panel (shows when creating or editing) -->
  {#if currentView === 'editor'}
    <div class="flex-1 h-full lg:block {mobileView === 'editor' ? 'block' : 'hidden'}">
      <DocumentEditor
        documentType={selectedDocumentType!}
        documentId={editingDocumentId}
        isCreating={isCreatingDocument}
        onBack={navigateBack}
        onSaved={async (docId) => {
          // Refresh the documents list to show the new document
          if (selectedDocumentType) {
            await fetchDocuments(selectedDocumentType);
          }
          navigateToEditDocument(docId, selectedDocumentType!);
        }}
        onAutoSaved={handleAutoSave}
        onDeleted={async () => {
          // Refresh the documents list and navigate back to documents view
          if (selectedDocumentType) {
            await fetchDocuments(selectedDocumentType);
            await goto(`/admin?docType=${selectedDocumentType}`, { replaceState: false });
          } else {
            await goto('/admin', { replaceState: false });
          }
        }}
      />
    </div>
  {/if}
</div>
