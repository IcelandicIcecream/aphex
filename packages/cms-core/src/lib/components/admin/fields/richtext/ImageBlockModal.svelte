<script lang="ts">
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Image as ImageIcon, Upload, Trash2, X } from '@lucide/svelte';
	import { assets } from '../../../../api/assets';

	interface Props {
		open: boolean;
		assetRef?: string;
		alt: string;
		readonly?: boolean;
		onAltChange: (alt: string) => void;
		onReplace: () => void;
		onRemove: () => void;
		onClose: () => void;
	}

	let {
		open,
		assetRef,
		alt,
		readonly = false,
		onAltChange,
		onReplace,
		onRemove,
		onClose
	}: Props = $props();

	const assetPromise = $derived(assetRef ? assets.getById(assetRef) : null);

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="bg-background/80 absolute inset-0 z-50 flex items-center justify-center p-4 lg:p-6"
		onclick={handleBackdropClick}
		onkeydown={handleKeydown}
		role="button"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="border-border bg-background w-full max-w-lg overflow-hidden rounded-lg border shadow-lg"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="border-border flex items-center justify-between border-b px-4 py-2">
				<span class="text-sm font-medium">Edit image</span>
				<Button variant="ghost" size="icon" class="h-7 w-7" onclick={onClose}>
					<X class="h-3.5 w-3.5" />
				</Button>
			</div>

			<div class="space-y-3 p-4">
				<!-- Preview -->
				<div
					class="bg-muted flex items-center justify-center overflow-hidden rounded-md"
					style="aspect-ratio: 16 / 9;"
				>
					{#if assetPromise}
						{#await assetPromise}
							<div
								class="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
							></div>
						{:then result}
							{#if result.success && result.data?.url}
								<img src={result.data.url} {alt} class="h-full w-full object-contain" />
							{:else}
								<div class="text-muted-foreground flex flex-col items-center gap-1">
									<ImageIcon class="h-8 w-8" />
									<span class="text-xs">Image not found</span>
								</div>
							{/if}
						{:catch}
							<div class="text-muted-foreground flex flex-col items-center gap-1">
								<ImageIcon class="h-8 w-8" />
								<span class="text-xs">Failed to load</span>
							</div>
						{/await}
					{:else}
						<div class="text-muted-foreground flex flex-col items-center gap-1">
							<ImageIcon class="h-8 w-8" />
							<span class="text-xs">No image</span>
						</div>
					{/if}
				</div>

				<!-- Alt text (per-placement override of the asset's default alt) -->
				<div class="space-y-1.5">
					<label class="text-sm font-medium" for="image-block-alt">Alt text</label>
					<p class="text-muted-foreground text-xs">
						Overrides the image's default alt for this spot. Leave blank to use the default.
					</p>
					<Input
						id="image-block-alt"
						type="text"
						placeholder="Describe this image..."
						value={alt}
						oninput={(e) => onAltChange(e.currentTarget.value)}
						disabled={readonly}
					/>
				</div>

				<!-- Actions -->
				{#if !readonly}
					<div class="flex items-center justify-between gap-2 pt-1">
						<Button variant="outline" size="sm" onclick={onReplace}>
							<Upload class="mr-1.5 h-4 w-4" />
							Replace
						</Button>
						<Button
							variant="ghost"
							size="sm"
							class="text-destructive hover:text-destructive"
							onclick={onRemove}
						>
							<Trash2 class="mr-1.5 h-4 w-4" />
							Remove
						</Button>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
