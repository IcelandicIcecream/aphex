<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
  import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton
  } from '$lib/components/ui/sidebar';
  import { page } from '$app/stores';

  interface DocumentType {
    name: string;
    title: string;
    description?: string;
    documentCount?: number;
  }

  interface Props {
    documentTypes: DocumentType[];
    objectTypes: DocumentType[];
  }

  let { documentTypes, objectTypes }: Props = $props();

  const currentPath = $derived($page.url.pathname);
</script>

<!-- Document Types Section -->
{#if documentTypes.length > 0}
  <SidebarGroup class="max-w-[350px]">
    <SidebarGroupLabel class="flex items-center justify-between">
      <span class="flex items-center gap-2">
        <span>📄</span>
        Content
      </span>
      <Badge variant="secondary" class="text-xs">{documentTypes.length}</Badge>
    </SidebarGroupLabel>

    <SidebarGroupContent>
      <SidebarMenu>
        {#each documentTypes as docType, index (index)}
          <SidebarMenuItem>
            <SidebarMenuButton
              onclick={goto(`/admin/documents/${docType.name}`)}
              isActive={currentPath.includes(`/documents/${docType.name}`)}
              class="group"
            >
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <div class="w-5 h-5 bg-blue-100 dark:bg-blue-900/20 rounded flex items-center justify-center flex-shrink-0">
                  <span class="text-blue-600 dark:text-blue-400 text-xs">📄</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium truncate">{docType.title}</div>
                  {#if docType.description}
                    <div class="text-xs text-muted-foreground truncate">{docType.description}</div>
                  {/if}
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        {/each}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
{/if}

<!-- Object Types Section -->
{#if objectTypes.length > 0}
  <SidebarGroup>
    <SidebarGroupLabel class="flex items-center justify-between">
      <span class="flex items-center gap-2">
        <span>🧩</span>
        Object Types
      </span>
      <Badge variant="secondary" class="text-xs">{objectTypes.length}</Badge>
    </SidebarGroupLabel>
  </SidebarGroup>
{/if}

<!-- Empty state -->
{#if documentTypes.length === 0 && objectTypes.length === 0}
  <SidebarGroup>
    <SidebarGroupContent>
      <div class="text-center py-6 text-muted-foreground space-y-2">
        <div class="text-2xl">📄</div>
        <div>
          <p class="text-sm">No content types found</p>
          <p class="text-xs">Define schemas in schemaTypes/</p>
        </div>
      </div>
    </SidebarGroupContent>
  </SidebarGroup>
{/if}
