<script lang="ts">
	import { Badge } from '@aphexcms/ui/shadcn/badge';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { documents } from '../../api/documents';
	import { toast } from 'svelte-sonner';

	interface Props {
		documentId: string;
		onClose: () => void;
		onRestored?: () => void;
		onPreviewVersion?: (version: { versionNumber: number; data: Record<string, any>; eventType: string; createdAt?: string } | null) => void;
	}

	let { documentId, onClose, onRestored, onPreviewVersion }: Props = $props();

	let versions = $state<any[]>([]);
	let loading = $state(true);
	let previewVersion = $state<any>(null);
	let filter = $state<'all' | 'publish' | 'draft'>('all');

	const filteredVersions = $derived(
		filter === 'all' ? versions : versions.filter((v) => v.eventType === filter)
	);

	$effect(() => {
		loadVersions();
	});

	async function loadVersions() {
		loading = true;
		try {
			const res = await documents.listVersions(documentId, { limit: 100 });
			if (res.success && res.data) {
				versions = res.data;
			}
		} catch {
			toast.error('Failed to load versions');
		} finally {
			loading = false;
		}
	}

	async function previewVersionData(version: any) {
		try {
			const res = await documents.getVersion(documentId, version.versionNumber);
			if (res.success && res.data) {
				previewVersion = { ...version, data: res.data.data };
				onPreviewVersion?.({
					versionNumber: version.versionNumber,
					data: res.data.data,
					eventType: version.eventType,
					createdAt: version.createdAt
				});
			}
		} catch {
			toast.error('Failed to load version');
		}
	}

	function clearPreview() {
		previewVersion = null;
		onPreviewVersion?.(null);
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="border-border bg-background flex h-14 items-center justify-between border-b px-3">
		<h3 class="text-sm font-medium">History</h3>
		<button
			class="hover:bg-muted rounded p-1 transition-colors"
			onclick={onClose}
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<!-- Filter tabs -->
	<div class="border-border flex border-b">
		{#each [{ value: 'all', label: 'All' }, { value: 'publish', label: 'Published' }, { value: 'draft', label: 'Drafts' }] as tab}
			<button
				class="flex-1 px-2 py-2 text-xs font-medium transition-colors {filter === tab.value ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}"
				onclick={() => { filter = tab.value as any; }}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Version List -->
	<div class="flex-1 overflow-auto">
		{#if loading}
			<div class="p-4 text-center">
				<span class="text-muted-foreground text-xs">Loading...</span>
			</div>
		{:else if filteredVersions.length === 0}
			<div class="p-4 text-center">
				<span class="text-muted-foreground text-xs">No {filter === 'all' ? '' : filter} versions</span>
			</div>
		{:else}
			{#each filteredVersions as version}
				<button
					class="w-full border-b px-3 py-2.5 text-left transition-colors hover:bg-muted {previewVersion?.versionNumber === version.versionNumber ? 'bg-muted border-l-2 border-l-primary' : ''}"
					onclick={() => previewVersionData(version)}
				>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground text-[11px]">
							{new Date(version.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
						</span>
						<Badge variant={version.eventType === 'publish' ? 'default' : 'secondary'} class="text-[9px] px-1.5 py-0">
							{version.eventType}
						</Badge>
					</div>
						{#if version.createdByName}
							<p class="text-muted-foreground mt-0.5 truncate text-[10px]">
								{version.createdByName}
							</p>
						{/if}
				</button>
			{/each}
		{/if}
	</div>
</div>
