<script lang="ts">
	import { Trash2, Image as ImageIcon } from '@lucide/svelte';
	import { assets } from '../../../../api/assets';

	interface Props {
		type: string;
		nodeKey: string;
		data: Record<string, unknown>;
		selected?: boolean;
		onEdit: () => void;
		onDelete: () => void;
	}

	let { data, selected = false, onEdit, onDelete }: Props = $props();

	const assetRef = $derived((data?.asset as any)?._ref as string | undefined);
	const assetPromise = $derived(assetRef ? assets.getById(assetRef) : null);
</script>

<div class="image-block-view group" class:selected>
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="image-block-content" onclick={onEdit}>
		{#if assetPromise}
			{#await assetPromise}
				<div class="image-block-placeholder">
					<div
						class="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
					></div>
				</div>
			{:then result}
				{#if result.success && result.data?.url}
					<img src={result.data.url} alt={result.data.alt || ''} class="image-block-img" />
				{:else}
					<div class="image-block-placeholder">
						<ImageIcon class="text-muted-foreground h-8 w-8" />
						<span class="text-muted-foreground text-xs">Image not found</span>
					</div>
				{/if}
			{:catch}
				<div class="image-block-placeholder">
					<ImageIcon class="text-muted-foreground h-8 w-8" />
					<span class="text-muted-foreground text-xs">Failed to load</span>
				</div>
			{/await}
		{:else}
			<div class="image-block-placeholder">
				<ImageIcon class="text-muted-foreground h-8 w-8" />
				<span class="text-muted-foreground text-xs">No image</span>
			</div>
		{/if}
	</div>

	<div class="image-block-actions">
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

<style>
	.image-block-view {
		position: relative;
		display: flex;
		align-items: flex-start;
		gap: 0.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.5rem;
		margin: 0.5em 0;
		transition: border-color 0.15s;
	}

	.image-block-view.selected {
		border-color: var(--primary);
		box-shadow: 0 0 0 1px var(--primary);
	}

	.image-block-content {
		flex: 1;
		min-width: 0;
		cursor: pointer;
	}

	.image-block-img {
		max-width: 100%;
		max-height: 300px;
		object-fit: contain;
		border-radius: calc(var(--radius) - 2px);
	}

	.image-block-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		height: 120px;
		background: var(--muted);
		border-radius: calc(var(--radius) - 2px);
	}

	.image-block-actions {
		opacity: 0;
		transition: opacity 0.15s;
	}

	.image-block-view:hover .image-block-actions {
		opacity: 1;
	}
</style>
