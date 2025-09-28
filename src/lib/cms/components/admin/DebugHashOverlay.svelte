<script lang="ts">
  import { createContentHash, createPublishedHash, hasUnpublishedChanges } from '$lib/cms/content-hash.js';

  interface Props {
    documentData: Record<string, any>;
    fullDocument: any;
    saving: boolean;
    documentId: string | null;
    hasUnsavedChanges: boolean;
    lastSaved: Date | null;
  }

  let { documentData, fullDocument, saving, documentId, hasUnsavedChanges, lastSaved }: Props = $props();

  // Calculate all the hash states
  const currentDraftHash = $derived(createContentHash(documentData)); // With timestamp
  const draftComparisonHash = $derived(createPublishedHash(documentData)); // Content-only for comparison
  const publishedHash = $derived(fullDocument?.publishedHash || null);
  const hasUnpublishedContent = $derived(hasUnpublishedChanges(documentData, publishedHash));
  const canPublish = $derived(hasUnpublishedContent && !saving && documentId);

  // Format hash for display (show first 8 chars)
  const formatHash = (hash: string | null) => hash ? `${hash.substring(0, 8)}...` : 'null';

  // Get status color
  const getStatusColor = (condition: boolean) => condition ? 'text-green-600' : 'text-red-600';
</script>

<div class="fixed top-4 right-4 bg-black/90 text-white p-4 rounded-lg font-mono text-xs z-50 max-w-sm">
  <div class="text-yellow-400 font-bold mb-2">🐛 Hash Debug Panel</div>

  <div class="space-y-1">
    <div>
      <span class="text-gray-400">Draft Hash (w/ time):</span>
      <span class="text-blue-400">{formatHash(currentDraftHash)}</span>
    </div>

    <div>
      <span class="text-gray-400">Draft Hash (content):</span>
      <span class="text-green-400">{formatHash(draftComparisonHash)}</span>
    </div>

    <div>
      <span class="text-gray-400">Published Hash:</span>
      <span class="text-purple-400">{formatHash(publishedHash)}</span>
    </div>

    <div class="text-xs text-gray-500">
      {draftComparisonHash === publishedHash ? '✅ Content matches' : '❌ Content differs'}
    </div>

    <div class="border-t border-gray-600 pt-2 mt-2">
      <div class="text-gray-300 text-xs mb-1">States:</div>

      <div>
        <span class="text-gray-400">Has Unpublished:</span>
        <span class={getStatusColor(hasUnpublishedContent)}>{hasUnpublishedContent}</span>
      </div>

      <div>
        <span class="text-gray-400">Can Publish:</span>
        <span class={getStatusColor(canPublish)}>{canPublish}</span>
      </div>

      <div>
        <span class="text-gray-400">Has Unsaved:</span>
        <span class={getStatusColor(hasUnsavedChanges)}>{hasUnsavedChanges}</span>
      </div>

      <div>
        <span class="text-gray-400">Saving:</span>
        <span class={getStatusColor(!saving)}>{saving}</span>
      </div>
    </div>

    <div class="border-t border-gray-600 pt-2 mt-2">
      <div class="text-gray-300 text-xs mb-1">Document:</div>

      <div>
        <span class="text-gray-400">ID:</span>
        <span class="text-cyan-400">{documentId || 'creating...'}</span>
      </div>

      <div>
        <span class="text-gray-400">Title:</span>
        <span class="text-cyan-400">"{documentData.title || 'Untitled'}"</span>
      </div>

      <div>
        <span class="text-gray-400">Data Keys:</span>
        <span class="text-cyan-400">{Object.keys(documentData).length}</span>
      </div>

      {#if lastSaved}
        <div>
          <span class="text-gray-400">Last Saved:</span>
          <span class="text-green-400">{lastSaved.toLocaleTimeString()}</span>
        </div>
      {/if}
    </div>

    <div class="border-t border-gray-600 pt-2 mt-2">
      <div class="text-gray-300 text-xs mb-1">Raw Data (first 100 chars):</div>
      <div class="text-gray-500 text-xs break-all">
        {JSON.stringify(documentData).substring(0, 100)}...
      </div>
    </div>
  </div>
</div>