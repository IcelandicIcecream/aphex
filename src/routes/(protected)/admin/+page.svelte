<script lang="ts">
import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
import { Button } from '$lib/components/ui/button';
import { SidebarTrigger } from '$lib/components/ui/sidebar';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { documents, ApiError } from '$lib/api/index.js';
import DocumentEditor from '$lib/cms/components/admin/DocumentEditor.svelte';
import { resolve } from '$app/paths';
import { SvelteURLSearchParams } from 'svelte/reactivity';

let { data } = $props();

const hasDocumentTypes = $derived(data.documentTypes.length > 0);

// Client-side routing state
let currentView = $state<'dashboard' | 'documents' | 'editor'>('dashboard');
let selectedDocumentType = $state<string | null>(null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let documentsList = $state<any[]>([]);
let loading = $state(false);
let error = $state<string | null>(null);

// Mobile navigation state (Sanity-style)
let mobileView = $state<'types' | 'documents' | 'editor'>('types');

// Window size reactivity
let windowWidth = $state(1024); // Default to desktop size

// Panel layout state for adaptive design
let typesPanel = $derived.by(() => {
  // Mobile (< 620px): Panel switching with breadcrumbs
  if (windowWidth < 620) {
    return mobileView === 'types' ? 'w-full' : 'hidden';
  }

  // Tablet/Small Desktop (620-745px): Only one panel open, rest compact
  if (windowWidth <= 745) {
    if (currentView === 'editor') {
      return 'w-[60px]'; // Compact when editing
    } else if (currentView === 'documents') {
      return 'w-[60px]'; // Compact when viewing documents (documents panel takes space)
    } else {
      return 'flex-1'; // Dashboard - full width
    }
  }

  // Wide screens (>1300px): Always show expanded panels with fixed widths
  if (windowWidth > 1300) {
    if (currentView === 'editor') {
      return 'w-[350px]'; // Fixed width even in editor mode
    } else if (currentView === 'documents') {
      return 'w-[350px]'; // Fixed width
    } else {
      return 'w-[350px]'; // Dashboard - fixed width, editor scales
    }
  }

  // Medium screens (1051-1300px): Types compact when editor is open, expanded otherwise
  if (windowWidth > 1050) {
    if (currentView === 'editor') {
      return 'w-[60px]'; // Types compact when editing
    } else {
      // When NOT editing (documents or dashboard), show expanded with fixed width
      if (currentView === 'documents') {
        return 'w-[350px]'; // Fixed width for documents view
      } else {
        return 'w-[350px]'; // Dashboard - fixed width
      }
    }
  }

  // Smaller screens (746-1050px): Both panels compact when editor is open
  if (currentView === 'editor') {
    return 'w-[60px]'; // Compact when editing
  } else {
    // When NOT editing, show expanded with fixed width
    if (currentView === 'documents') {
      return 'w-[350px]'; // Fixed width for documents view
    } else {
      return 'w-[350px]'; // Dashboard - fixed width
    }
  }
});

let documentsPanel = $derived.by(() => {
  // Mobile (< 620px): Panel switching with breadcrumbs
  if (windowWidth < 620) {
    return mobileView === 'documents' ? 'w-full' : 'hidden';
  }

  if (!selectedDocumentType) return 'hidden';

  // Tablet/Small Desktop (620-745px): Only one panel open, rest compact
  if (windowWidth <= 745) {
    if (currentView === 'editor') {
      return 'w-[60px]'; // Compact when editing (editor takes space)
    } else if (currentView === 'documents') {
      return 'flex-1'; // Full width when documents are focused
    } else {
      return 'hidden';
    }
  }

  // Wide screens (>1300px): Always show expanded documents panel with fixed width
  if (windowWidth > 1300) {
    if (currentView === 'editor') {
      return 'w-[350px]'; // Fixed width when editor is open
    } else if (currentView === 'documents') {
      return 'w-[350px]'; // Fixed width when documents are focused
    } else {
      return 'hidden';
    }
  }

  // Medium screens (1051-1300px): Documents still expanded when editor is open
  if (windowWidth > 1050) {
    if (currentView === 'editor') {
      return 'w-[350px]'; // Fixed width when editing
    } else if (currentView === 'documents') {
      return 'w-[350px]'; // Fixed width when documents are focused
    } else {
      return 'hidden';
    }
  }

  // Smaller screens (746-1050px): Both panels compact when editor is open
  if (currentView === 'editor') {
    return 'w-[60px]'; // Compact when editing (just shows title)
  } else if (currentView === 'documents') {
    return 'w-[350px]'; // Fixed width when documents are focused
  } else {
    return 'hidden';
  }
});

let editorPanel = $derived.by(() => {
  // Mobile (< 620px): Panel switching with breadcrumbs
  if (windowWidth < 620) {
    return mobileView === 'editor' ? 'w-full' : 'hidden';
  }

  if (currentView === 'editor') {
    return 'flex-1'; // Full width when editing
  } else {
    return 'hidden';
  }
});

// Update window width on resize
$effect(() => {
  if (typeof window !== 'undefined') {
    windowWidth = window.innerWidth;

    const handleResize = () => {
      windowWidth = window.innerWidth;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }
});

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


<!-- Sanity-style breadcrumb navigation (mobile < 620px) -->
<div class="{windowWidth < 620 ? 'block' : 'hidden'} border-b border-border bg-background">
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
        {(data.documentTypes.find(t => t.name === selectedDocumentType)?.title || selectedDocumentType) + 's'}
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
        {selectedDocumentType ? ((data.documentTypes.find(t => t.name === selectedDocumentType)?.title || selectedDocumentType) + 's') : 'Content Types'}
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


<div class="flex h-screen overflow-hidden">
  <!-- Schema Error Display (when validation fails) -->
  {#if data.schemaError}
    <div class="flex-1 flex items-center justify-center p-8 bg-destructive/5">
      <div class="max-w-2xl w-full">
        <Alert variant="destructive">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.704-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <AlertTitle>Schema Validation Error</AlertTitle>
          <AlertDescription class="whitespace-pre-line">
            {data.schemaError.message}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  {:else}

  <!-- Left Sidebar - Document Types -->
  <div class="h-full border-r transition-all duration-200 {typesPanel} {typesPanel === 'hidden' ? 'hidden' : 'block'}">
    <div class="h-full flex flex-col overflow-hidden">
    {#if typesPanel === 'w-[60px]'}
      <!-- Compact Sidebar - Just "Content" (Clickable to expand to document types) -->
      <button
        onclick={async () => {
          // Navigate back to the current document type view (not editor) to expand the types panel
          if (selectedDocumentType) {
            await goto(`/admin?docType=${selectedDocumentType}`, { replaceState: false });
          } else {
            await goto('/admin', { replaceState: false });
          }
        }}
        class="h-full flex flex-col hover:bg-muted/30 transition-colors w-full"
        title="Click to expand content types"
      >
        <!-- "Content" header - top aligned -->
        <div class="p-2 flex-1 flex items-start justify-center pt-8 text-left">
          <div class="text-sm font-medium text-foreground transform rotate-90 whitespace-nowrap">
            Content
          </div>
        </div>
      </button>
    {:else}
      <!-- Expanded Sidebar - Full Document Types List -->
      <div class="h-full overflow-auto">
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
                <h3 class="font-medium text-sm">{docType.title}s</h3>
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
    {/if}
    </div>
  </div>

  <!-- Center Panel - Documents List (shows when document type selected) -->
  {#if selectedDocumentType}
    <div class="h-full border-r transition-all duration-200 {documentsPanel} {documentsPanel === 'hidden' ? 'hidden' : 'block'}">
      <div class="h-full flex flex-col overflow-hidden">
      {#if documentsPanel === 'w-[60px]'}
        <!-- Compact Documents Panel - Vertical Text -->
        <button
          onclick={async () => {
            await goto(`/admin?docType=${selectedDocumentType}`, { replaceState: false });
          }}
          class="h-full flex flex-col hover:bg-muted/30 transition-colors w-full"
          title="Click to expand documents list"
        >
          <div class="p-2 flex-1 flex items-start justify-center pt-8 text-left">
            <div class="text-sm font-medium text-foreground transform rotate-90 whitespace-nowrap">
              {(data.documentTypes.find(t => t.name === selectedDocumentType)?.title || selectedDocumentType) + 's'}
            </div>
          </div>
        </button>
      {:else}
        <!-- Expanded Documents Panel -->
        <!-- Header with document type info -->
        <div class="p-3 border-b border-border bg-muted/20 {documentsPanel === 'w-[300px]' ? 'p-2' : 'p-3'}">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3 {documentsPanel === 'w-[300px]' ? 'gap-2' : 'gap-3'}">
            <div class="w-6 h-6 flex items-center justify-center {documentsPanel === 'w-[300px]' ? 'w-5 h-5' : 'w-6 h-6'}">
              <span class="text-muted-foreground">📄</span>
            </div>
            <div class="{documentsPanel === 'w-[300px]' ? 'min-w-0' : ''}">
              <h3 class="font-medium text-sm {documentsPanel === 'w-[300px]' ? 'truncate text-xs' : 'text-sm'}">
                {(data.documentTypes.find(t => t.name === selectedDocumentType)?.title || selectedDocumentType) + 's'}
              </h3>
              {#if documentsPanel !== 'w-[300px]'}
                <p class="text-xs text-muted-foreground">
                  {documentsList.length} document{documentsList.length !== 1 ? 's' : ''}
                </p>
              {/if}
            </div>
          </div>

          <!-- Create document button -->
          <Button
            size="sm"
            variant="ghost"
            onclick={() => navigateToCreateDocument(selectedDocumentType!)}
            class="h-8 w-8 p-0 {documentsPanel === 'w-[300px]' ? 'h-6 w-6' : 'h-8 w-8'}"
            title="Create new document"
          >
            <svg class="w-4 h-4 {documentsPanel === 'w-[300px]' ? 'w-3 h-3' : 'w-4 h-4'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </Button>
        </div>
      </div>

      <!-- Scrollable Documents List -->
      <div class="flex-1 overflow-auto">
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
            class="group flex items-center justify-between p-3 hover:bg-muted/50 transition-colors border-b border-border w-full text-left {documentsPanel === 'w-[300px]' ? 'p-2' : 'p-3'}"
          >
            <div class="flex items-center gap-3 {documentsPanel === 'w-[300px]' ? 'gap-2' : 'gap-3'} flex-1 min-w-0">
              <!-- Document Icon -->
              <div class="w-6 h-6 flex items-center justify-center {documentsPanel === 'w-[300px]' ? 'w-4 h-4' : 'w-6 h-6'}">
                <span class="text-muted-foreground">📄</span>
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <h3 class="font-medium text-sm truncate {documentsPanel === 'w-[300px]' ? 'text-xs' : 'text-sm'}">{doc.title}</h3>
                {#if documentsPanel !== 'w-[300px]'}
                  {#if doc.slug}
                    <p class="text-xs text-muted-foreground">/{doc.slug}</p>
                  {:else if doc.status}
                    <p class="text-xs text-muted-foreground">{doc.status}</p>
                  {/if}
                {/if}
              </div>
            </div>

            <!-- Date - hide in compact mode -->
            {#if documentsPanel !== 'w-[300px]'}
              <div class="text-xs text-muted-foreground">
                {doc.updatedAt?.toLocaleDateString() || ''}
              </div>
            {/if}
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
      </div>
    </div>
  {/if}

  <!-- Document Editor Panel (shows when creating or editing) -->
  {#if currentView === 'editor'}
    <div class="h-full transition-all duration-200 {editorPanel} {editorPanel === 'hidden' ? 'hidden' : 'block'}">
      <div class="h-full flex flex-col overflow-auto">
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
    </div>
  {/if}
  {/if} <!-- End schema error conditional -->
</div>
