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
    SidebarInset,
    SidebarFooter
  } from '@aphex/ui/shadcn/sidebar';
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
  } from '@aphex/ui/shadcn/dropdown-menu';
  import { ModeWatcher } from "mode-watcher";

  let { children } = $props();

  // Sidebar state - start collapsed by default
  let sidebarOpen = $state(false);
  let isHovering = $state(false);
  let isLocked = $state(false); // Track if sidebar is locked open
  let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

  // Generic navigation items (not document-specific)
  const navItems = [
    { href: '/admin', label: 'Content', icon: '📝' },
    { href: '/admin/media', label: 'Media', icon: '🖼️' },
    { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
  ];

  let currentPath = $derived(page.url.pathname);

  function handleSidebarMouseEnter() {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    if (!sidebarOpen && !isLocked) {
      isHovering = true;
      sidebarOpen = true;
    }
  }

  function handleSidebarMouseLeave() {
    if (isHovering && !isLocked) {
      hoverTimeout = setTimeout(() => {
        sidebarOpen = false;
        isHovering = false;
      }, 300);
    }
  }

  function toggleLock() {
    isLocked = !isLocked;
    if (isLocked) {
      // Lock the sidebar open
      if (hoverTimeout) clearTimeout(hoverTimeout);
      sidebarOpen = true;
      isHovering = false;
    } else {
      // Unlock - if mouse is not over sidebar, close it
      if (!isHovering) {
        sidebarOpen = false;
      }
    }
  }
</script>

<ModeWatcher/>
<SidebarProvider bind:open={sidebarOpen}>
  <div class="relative">
    <Sidebar
      collapsible="icon"
      onmouseenter={handleSidebarMouseEnter}
      onmouseleave={handleSidebarMouseLeave}
    >
      <SidebarHeader>
        <div class="flex items-center justify-between p-2">
          <h1 class="text-xl font-bold group-data-[collapsible=icon]:hidden">TCR CMS</h1>
          {#if sidebarOpen}
            <!-- Show lock/unlock button only when expanded -->
            <button
              onclick={toggleLock}
              class="flex items-center justify-center w-8 h-8 rounded hover:bg-sidebar-accent transition-colors"
              title={isLocked ? 'Unlock sidebar' : 'Lock sidebar open'}
            >
              {#if isLocked}
                <!-- Lock icon (locked) -->
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              {:else}
                <!-- Pin icon (unlocked) -->
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              {/if}
            </button>
          {/if}
        </div>
      </SidebarHeader>

    <SidebarContent>
      <SidebarMenu>
        {#each navItems as item, index (index)}
          <SidebarMenuItem>
            <SidebarMenuButton onclick={() => goto(item.href)} isActive={currentPath.startsWith(item.href)}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        {/each}
      </SidebarMenu>
    </SidebarContent>

    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger>
              {#snippet child({ props })}
                <SidebarMenuButton
                  {...props}
                  class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div class="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    👤
                  </div>
                  <span>Admin User</span>
                </SidebarMenuButton>
              {/snippet}
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" class="w-[--bits-dropdown-menu-anchor-width]">
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
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
    </Sidebar>
  </div>

  <SidebarInset>
    <main class="flex-1 overflow-hidden">
      {@render children()}
    </main>
  </SidebarInset>
</SidebarProvider>
