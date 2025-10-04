<script lang="ts">
	import { Badge } from '@aphex/ui/shadcn/badge';
	import {
		SidebarGroup,
		SidebarGroupLabel,
		SidebarGroupContent,
		SidebarMenu,
		SidebarMenuItem,
		SidebarMenuButton
	} from '@aphex/ui/shadcn/sidebar';
	import { page } from '$app/state';

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

	const currentPath = $derived(page.url.pathname);
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
							<div class="flex min-w-0 flex-1 items-center gap-2">
								<div
									class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-blue-100 dark:bg-blue-900/20"
								>
									<span class="text-xs text-blue-600 dark:text-blue-400">📄</span>
								</div>
								<div class="min-w-0 flex-1">
									<div class="truncate text-sm font-medium">{docType.title}</div>
									{#if docType.description}
										<div class="text-muted-foreground truncate text-xs">{docType.description}</div>
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
			<div class="text-muted-foreground space-y-2 py-6 text-center">
				<div class="text-2xl">📄</div>
				<div>
					<p class="text-sm">No content types found</p>
					<p class="text-xs">Define schemas in schemaTypes/</p>
				</div>
			</div>
		</SidebarGroupContent>
	</SidebarGroup>
{/if}
