<script lang="ts">
  /**
   * AdminApp - Complete CMS Admin Interface
   * A packaged, reusable Sanity-style admin UI
   */
  import { Alert, AlertDescription, AlertTitle } from '@aphex/ui/shadcn/alert';
  import { Button } from '@aphex/ui/shadcn/button';
  import SunIcon from "@lucide/svelte/icons/sun";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import { toggleMode } from "mode-watcher";
  import * as Tabs from "@aphex/ui/shadcn/tabs";
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import type { SchemaType } from '../types.js';
  import DocumentEditor from './admin/DocumentEditor.svelte';
  import { setSchemaContext } from '../schema-context.svelte.js';

  interface DocumentType {
    name: string;
    title: string;
    description?: string;
  }

  interface Props {
    schemas: SchemaType[];
    documentTypes: DocumentType[];
    schemaError?: { message: string } | null;
    title?: string;
  }

  let { schemas, documentTypes, schemaError = null, title = 'Aphex CMS' }: Props = $props();

  // Set schema context for child components
  setSchemaContext(schemas);

  const hasDocumentTypes = $derived(documentTypes.length > 0);

  // Client-side routing state
  let currentView = $state<'dashboard' | 'documents' | 'editor'>('dashboard');
  let selectedDocumentType = $state<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let documentsList = $state<any[]>([]);
  let loading = $state(false);
  let error = $state<string | null>(null);

  // Mobile navigation state (Sanity-style)
  let mobileView = $state<'types' | 'documents' | 'editor'>('types');

  // Top-level tab state (Structure / Vision)
  let activeTab = $state<'structure' | 'vision'>('structure');

  // Window size reactivity
  let windowWidth = $state(1024); // Default to desktop size

  // Panel layout state for adaptive design (same logic as before)
  let typesPanel = $derived.by(() => {
    if (windowWidth < 620) {
      return mobileView === 'types' ? 'w-full' : 'hidden';
    }
    if (windowWidth <= 745) {
      if (currentView === 'editor') return 'w-[60px]';
      else if (currentView === 'documents') return 'w-[60px]';
      else return 'flex-1';
    }
    if (windowWidth > 1300) return 'w-[350px]';
    if (windowWidth > 1050) {
      return currentView === 'editor' ? 'w-[60px]' : 'w-[350px]';
    }
    if (currentView === 'editor') return 'w-[60px]';
    else return 'w-[350px]';
  });

  let documentsPanel = $derived.by(() => {
    if (windowWidth < 620) {
      return mobileView === 'documents' ? 'w-full' : 'hidden';
    }
    if (!selectedDocumentType) return 'hidden';
    if (windowWidth <= 745) {
      if (currentView === 'editor') return 'w-[60px]';
      else if (currentView === 'documents') return 'flex-1';
      else return 'hidden';
    }
    if (windowWidth > 1300) return 'w-[350px]';
    if (windowWidth > 1050) return 'w-[350px]';
    if (currentView === 'editor') return 'w-[60px]';
    else if (currentView === 'documents') return 'w-[350px]';
    else return 'hidden';
  });

  let editorPanel = $derived.by(() => {
    if (windowWidth < 620) {
      return mobileView === 'editor' ? 'w-full' : 'hidden';
    }
    return currentView === 'editor' ? 'flex-1' : 'hidden';
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
    const url = page.url;
    const docType = url.searchParams.get('docType');
    const action = url.searchParams.get('action');
    const docId = url.searchParams.get('docId');

    if (action === 'create' && docType) {
      currentView = 'editor';
      mobileView = 'editor';
      selectedDocumentType = docType;
      isCreatingDocument = true;
      editingDocumentId = null;
      fetchDocuments(docType);
    } else if (docId) {
      currentView = 'editor';
      mobileView = 'editor';
      editingDocumentId = docId;
      isCreatingDocument = false;

      if (docType) {
        selectedDocumentType = docType;
        if (documentsList.length === 0 || selectedDocumentType !== docType) {
          fetchDocuments(docType);
        }
      } else {
        fetchDocumentForEditing(docId);
      }
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
    await goto(`/admin?docType=${docType}`, { replaceState: false });
    mobileView = 'documents';
  }

  async function navigateToCreateDocument(docType: string) {
    await goto(`/admin?docType=${docType}&action=create`, { replaceState: false });
    mobileView = 'editor';
  }

  async function navigateToEditDocument(docId: string, docType?: string) {
    const params = new SvelteURLSearchParams({ docId });
    if (docType) params.set('docType', docType);
    await goto(`/admin?${params.toString()}`, { replaceState: false });
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
    if (documentsList.length > 0) {
      documentsList = documentsList.map(doc =>
        doc.id === documentId ? { ...doc, title: title } : doc
      );
    }
  }

  async function fetchDocumentForEditing(docId: string) {
    loading = true;
    error = null;

    try {
      const response = await fetch(`/api/documents/${docId}`);
      const result = await response.json();

      if (result.success && result.data) {
        const documentType = result.data.type;

        if (documentsList.length === 0 || selectedDocumentType !== documentType) {
          await fetchDocuments(documentType);
        }

        selectedDocumentType = documentType;
      } else {
        throw new Error(result.error || 'Failed to fetch document');
      }
    } catch (err) {
      console.error('Failed to fetch document:', err);
      error = err instanceof Error ? err.message : 'Failed to load document';
      await goto('/admin', { replaceState: true });
    } finally {
      loading = false;
    }
  }

  async function fetchDocuments(docType: string) {
    loading = true;
    error = null;

    try {
      const response = await fetch(`/api/documents?docType=${docType}&limit=50`);
      const result = await response.json();

      if (result.success && result.data) {
        documentsList = result.data.map((doc: any) => {
          const docData = doc.draftData || doc.publishedData || {};
          return {
            id: doc.id,
            title: docData.title || `Untitled`,
            status: doc.status,
            publishedAt: doc.publishedAt ? new Date(doc.publishedAt) : null,
            updatedAt: doc.updatedAt ? new Date(doc.updatedAt) : null,
            createdAt: doc.createdAt ? new Date(doc.createdAt) : null,
            hasChanges: doc.status === 'published' && doc.draftData !== null &&
                       JSON.stringify(doc.draftData) !== JSON.stringify(doc.publishedData)
          };
        });
      } else {
        throw new Error(result.error || 'Failed to fetch documents');
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
      error = err instanceof Error ? err.message : 'Failed to load documents';
      documentsList = [];
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>{activeTab === 'structure' ? 'Content' : 'Vision'} - {title}</title>
</svelte:head>

<div class="border-b border-border bg-background">
  <div class="relative flex items-center h-12 px-4">
    <!-- Centered Tabs -->
    <div class="mx-auto">
      <Tabs.Root bind:value={activeTab}>
        <Tabs.List class="bg-transparent border-none h-auto p-0 flex">
          <Tabs.Trigger
            value="structure"
            class="relative bg-transparent border-none shadow-none font-medium text-sm px-4 py-2
              data-[state=active]:bg-transparent data-[state=active]:text-foreground
              data-[state=inactive]:text-muted-foreground hover:text-foreground transition-colors
              data-[state=active]:after:absolute data-[state=active]:after:bottom-0
              data-[state=active]:after:left-0 data-[state=active]:after:right-0
              data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary"
          >
            Structure
          </Tabs.Trigger>
          <Tabs.Trigger
            value="vision"
            class="relative bg-transparent border-none shadow-none font-medium text-sm px-4 py-2
              data-[state=active]:bg-transparent data-[state=active]:text-foreground
              data-[state=inactive]:text-muted-foreground hover:text-foreground transition-colors
              data-[state=active]:after:absolute data-[state=active]:after:bottom-0
              data-[state=active]:after:left-0 data-[state=active]:after:right-0
              data-[state=active]:after:h-0.5 data-[state=active]:after:bg-primary"
          >
            Vision
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>
    </div>

    <!-- Right-aligned button -->
    <div class="absolute right-4">
      <Button onclick={toggleMode} variant="outline" size="icon">
        <SunIcon
          class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 !transition-all dark:-rotate-90 dark:scale-0"
        />
        <MoonIcon
          class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 !transition-all dark:rotate-0 dark:scale-100"
        />
        <span class="sr-only">Toggle theme</span>
      </Button>
    </div>
  </div>
</div>

<!-- Mobile breadcrumb navigation (< 620px) -->
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
        {(documentTypes.find(t => t.name === selectedDocumentType)?.title || selectedDocumentType) + 's'}
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
        {selectedDocumentType ? ((documentTypes.find(t => t.name === selectedDocumentType)?.title || selectedDocumentType) + 's') : 'Content Types'}
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

<!-- Main Content -->
<div style="height: {windowWidth < 620 ? 'calc(100vh - 6rem)' : 'calc(100vh - 3rem)'}">
  <Tabs.Root bind:value={activeTab} class="h-full">
    <Tabs.Content value="structure" class="h-full">
      <div class="flex h-full">
        {#if schemaError}
          <div class="flex-1 flex items-center justify-center p-8 bg-destructive/5">
            <div class="max-w-2xl w-full">
              <Alert variant="destructive">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.704-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <AlertTitle>Schema Validation Error</AlertTitle>
                <AlertDescription class="whitespace-pre-line">
                  {schemaError.message}
                </AlertDescription>
              </Alert>
            </div>
          </div>
        {:else}
          <!-- Types Panel -->
          <div class="border-r transition-all duration-200 {typesPanel} {typesPanel === 'hidden' ? 'hidden' : 'block'} h-full">
            {#if typesPanel === 'w-[60px]'}
              <button
                onclick={async () => {
                  if (selectedDocumentType) {
                    await goto(`/admin?docType=${selectedDocumentType}`, { replaceState: false });
                  } else {
                    await goto('/admin', { replaceState: false });
                  }
                }}
                class="h-full flex flex-col hover:bg-muted/30 transition-colors w-full"
                title="Click to expand content types"
              >
                <div class="p-2 flex-1 flex items-start justify-center pt-8 text-left">
                  <div class="text-sm font-medium text-foreground transform rotate-90 whitespace-nowrap">
                    Content
                  </div>
                </div>
              </button>
            {:else}
              <div class="h-full overflow-auto">
                {#if hasDocumentTypes}
                  {#each documentTypes as docType, index (index)}
                    <button
                      onclick={() => navigateToDocumentType(docType.name)}
                      class="group flex items-center justify-between p-3 hover:bg-muted/50 transition-colors border-b border-border first:border-t w-full text-left {selectedDocumentType === docType.name ? 'bg-muted/50' : ''}"
                    >
                      <div class="flex items-center gap-3">
                        <div class="w-6 h-6 flex items-center justify-center">
                          <span class="text-muted-foreground">📄</span>
                        </div>
                        <div>
                          <h3 class="font-medium text-sm">{docType.title}s</h3>
                          {#if docType.description}
                            <p class="text-xs text-muted-foreground">{docType.description}</p>
                          {/if}
                        </div>
                      </div>
                      <div class="text-muted-foreground group-hover:text-foreground transition-colors">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  {/each}
                {:else}
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

          <!-- Documents Panel -->
          {#if selectedDocumentType}
            <div class="border-r transition-all duration-200 {documentsPanel} {documentsPanel === 'hidden' ? 'hidden' : 'block'} h-full">
              {#if documentsPanel === 'w-[60px]'}
                <button
                  onclick={async () => {
                    await goto(`/admin?docType=${selectedDocumentType}`, { replaceState: false });
                  }}
                  class="h-full flex flex-col hover:bg-muted/30 transition-colors w-full"
                  title="Click to expand documents list"
                >
                  <div class="p-2 flex-1 flex items-start justify-center pt-8 text-left">
                    <div class="text-sm font-medium text-foreground transform rotate-90 whitespace-nowrap">
                      {(documentTypes.find(t => t.name === selectedDocumentType)?.title || selectedDocumentType) + 's'}
                    </div>
                  </div>
                </button>
              {:else}
                <div class="p-3 border-b border-border bg-muted/20">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-6 h-6 flex items-center justify-center">
                        <span class="text-muted-foreground">📄</span>
                      </div>
                      <div>
                        <h3 class="font-medium text-sm">
                          {(documentTypes.find(t => t.name === selectedDocumentType)?.title || selectedDocumentType) + 's'}
                        </h3>
                        <p class="text-xs text-muted-foreground">
                          {documentsList.length} document{documentsList.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onclick={() => navigateToCreateDocument(selectedDocumentType!)}
                      class="h-8 w-8 p-0"
                      title="Create new document"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </Button>
                  </div>
                </div>

                <div class="flex-1 overflow-auto">
                  {#if error}
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
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                          <div class="w-6 h-6 flex items-center justify-center">
                            <span class="text-muted-foreground">📄</span>
                          </div>
                          <div class="flex-1 min-w-0">
                            <h3 class="font-medium text-sm truncate">{doc.title}</h3>
                            {#if doc.slug}
                              <p class="text-xs text-muted-foreground">/{doc.slug}</p>
                            {:else if doc.status}
                              <p class="text-xs text-muted-foreground">{doc.status}</p>
                            {/if}
                          </div>
                        </div>
                        <div class="text-xs text-muted-foreground">
                          {doc.updatedAt?.toLocaleDateString() || ''}
                        </div>
                      </button>
                    {/each}
                  {:else}
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
          {/if}

          <!-- Editor Panel -->
          {#if currentView === 'editor'}
            <div class="transition-all duration-200 {editorPanel} {editorPanel === 'hidden' ? 'hidden' : 'block'} h-full overflow-y-auto">
              <DocumentEditor
                schemas={schemas}
                documentType={selectedDocumentType!}
                documentId={editingDocumentId}
                isCreating={isCreatingDocument}
                onBack={navigateBack}
                onSaved={async (docId) => {
                  if (selectedDocumentType) {
                    await fetchDocuments(selectedDocumentType);
                  }
                  navigateToEditDocument(docId, selectedDocumentType!);
                }}
                onAutoSaved={handleAutoSave}
                onPublished={async (docId) => {
                  if (selectedDocumentType) {
                    await fetchDocuments(selectedDocumentType);
                  }
                }}
                onDeleted={async () => {
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
        {/if}
      </div>
    </Tabs.Content>

    <Tabs.Content value="vision" class="h-full m-0 p-0">
      <div class="h-full flex items-center justify-center bg-muted/10">
        <div class="text-center space-y-4">
          <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <svg class="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <div>
            <h3 class="font-semibold text-lg mb-2">GraphQL Playground</h3>
            <p class="text-muted-foreground mb-4">
              Query your CMS data with the GraphQL API
            </p>
            <a
              href="/api/graphql"
              target="_blank"
              class="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Open Playground
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </Tabs.Content>
  </Tabs.Root>
</div>
