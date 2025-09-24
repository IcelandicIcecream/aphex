<script lang="ts">
  import { page } from '$app/state';
  import {
    SidebarProvider,
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarTrigger,
    SidebarInset,
    SidebarFooter
  } from '$lib/components/ui/sidebar';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
  } from '$lib/components/ui/dropdown-menu';
  import { Button } from '$lib/components/ui/button';

  let { children } = $props();

  // Generic navigation items (not document-specific)
  const navItems = [
    { href: '/admin', label: 'Content', icon: '📝' },
    { href: '/admin/media', label: 'Media', icon: '🖼️' },
    { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ];

  let currentPath = $derived(page.url.pathname);
</script>

<SidebarProvider>
  <Sidebar>
    <SidebarHeader>
      <h1 class="text-xl font-bold p-2">TCR CMS</h1>
    </SidebarHeader>

    <SidebarContent>
      <SidebarMenu>
        {#each navItems as item, index (index)}
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={currentPath.startsWith(item.href)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        {/each}
      </SidebarMenu>
    </SidebarContent>

    <SidebarFooter>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            variant="ghost"
            class="w-full justify-start gap-2 p-2"
          >
            <div class="flex items-center gap-2 w-full">
              <div class="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                👤
              </div>
              <div class="text-left flex-1">
                <p class="text-sm font-medium">Admin User</p>
                <p class="text-xs text-muted-foreground">admin@example.com</p>
              </div>
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuItem>
            <span>⚙️</span>
            <span class="ml-2">Account Settings</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem class="text-red-600">
            <span>🚪</span>
            <span class="ml-2">Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarFooter>
  </Sidebar>

  <SidebarInset>
    <header class="flex h-16 items-center gap-2 border-b px-4">
      <SidebarTrigger class="-ml-1" />
      <h2 class="text-lg font-semibold">
        {#if currentPath === '/admin'}
          Content
        {:else if currentPath.includes('/media')}
          Media
        {:else if currentPath.includes('/settings')}
          Settings
        {:else}
          Admin
        {/if}
      </h2>
    </header>

    <main class="flex-1 overflow-auto p-6">
      {@render children()}
    </main>
  </SidebarInset>
</SidebarProvider>
