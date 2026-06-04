<script lang="ts">
	interface Props {
		type: string;
		nodeKey: string;
		data: Record<string, unknown>;
		selected: boolean;
		onEdit: () => void;
		onDelete: () => void;
	}

	let { type, data, selected, onEdit, onDelete }: Props = $props();

	const label = $derived(
		(data?.title as string) || (data?.text as string) || (data?.name as string) || type
	);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<span
	class="inline-object-chip"
	class:selected
	onclick={onEdit}
	title="Edit {type}"
	role="button"
	tabindex="0"
	onkeydown={(e) => {
		if (e.key === 'Enter') onEdit();
	}}
>
	<span class="inline-object-type">{type.slice(0, 2).toUpperCase()}</span>
	<span class="inline-object-label">{label}</span>
	<button
		class="inline-object-delete"
		onclick={(e) => {
			e.stopPropagation();
			onDelete();
		}}
		title="Remove">×</button
	>
</span>

<style>
	.inline-object-chip {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		padding: 1px 6px 1px 2px;
		border-radius: 4px;
		border: 1px solid var(--border);
		background: var(--muted);
		font-size: 0.75rem;
		line-height: 1.4;
		cursor: pointer;
		vertical-align: baseline;
		transition: border-color 0.15s;
	}

	.inline-object-chip:hover,
	.inline-object-chip.selected {
		border-color: var(--primary);
	}

	.inline-object-type {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border-radius: 2px;
		background: var(--muted-foreground);
		color: var(--background);
		font-size: 8px;
		font-weight: 600;
		flex-shrink: 0;
	}

	.inline-object-label {
		max-width: 120px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--foreground);
	}

	.inline-object-delete {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		border: none;
		background: none;
		color: var(--muted-foreground);
		font-size: 12px;
		cursor: pointer;
		padding: 0;
		border-radius: 2px;
		opacity: 0;
		transition:
			opacity 0.15s,
			color 0.15s;
	}

	.inline-object-chip:hover .inline-object-delete {
		opacity: 1;
	}

	.inline-object-delete:hover {
		color: var(--destructive);
	}
</style>
