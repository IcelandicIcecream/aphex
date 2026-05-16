<script lang="ts">
	import { Pencil, Trash2, GripVertical } from '@lucide/svelte';

	interface Props {
		type: string;
		nodeKey: string;
		data: Record<string, unknown>;
		selected?: boolean;
		onEdit: () => void;
		onDelete: () => void;
	}

	let { type, data, selected = false, onEdit, onDelete }: Props = $props();

	const title = $derived((data.title as string) || (data.name as string) || type);

	const subtitle = $derived.by(() => {
		const preview: string[] = [];
		for (const [key, val] of Object.entries(data)) {
			if (key.startsWith('_') || key === 'title' || key === 'name') continue;
			if (typeof val === 'string' && val.length > 0) {
				preview.push(val.length > 40 ? val.slice(0, 40) + '...' : val);
				if (preview.length >= 2) break;
			}
		}
		return preview.join(' - ');
	});
</script>

<div
	class="border-rule bg-muted/20 hover:bg-muted/40 group my-2 flex items-center gap-2 rounded-md border px-3 py-2 transition-colors"
	class:ring-primary={selected}
	class:ring-2={selected}
>
	<div
		class="text-muted-foreground cursor-grab opacity-0 transition-opacity group-hover:opacity-100"
	>
		<GripVertical class="h-4 w-4" />
	</div>

	<button type="button" class="flex min-w-0 flex-1 items-center gap-3 text-left" onclick={onEdit}>
		<div
			class="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded text-xs font-medium uppercase"
		>
			{type.slice(0, 2)}
		</div>
		<div class="min-w-0 flex-1">
			<div class="text-foreground text-sm font-medium capitalize">{title}</div>
			{#if subtitle}
				<div class="text-muted-foreground truncate text-xs">{subtitle}</div>
			{/if}
		</div>
	</button>

	<div class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
		<button
			type="button"
			class="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
			onclick={onEdit}
			title="Edit"
		>
			<Pencil class="h-3.5 w-3.5" />
		</button>
		<button
			type="button"
			class="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
			onclick={onDelete}
			title="Remove"
		>
			<Trash2 class="h-3.5 w-3.5" />
		</button>
	</div>
</div>
