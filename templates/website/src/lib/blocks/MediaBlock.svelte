<script lang="ts">
	/** Media — a full-width image with an optional caption. */
	import { Image } from '@aphexcms/cms-core/image';
	import { usePreview } from '@aphexcms/visual-editing';
	import type { MediaBlockValue } from './types';

	let { block, index }: { block: MediaBlockValue; index?: number } = $props();

	/**
	 * A block whose whole content is an image has nothing for the overlay to
	 * attach to — stega markers ride inside strings, and there is no string here.
	 * `arrayIndex` points at this row of `layout`, so clicking the image opens the
	 * right block rather than the field as a whole. Returns `{}` outside preview.
	 */
	const ve = usePreview();
</script>

{#if block.media?.asset?.url}
	<figure class="container my-12">
		<div
			class="bg-muted overflow-hidden rounded-xl border"
			{...ve.edit({ field: 'layout', arrayIndex: index })}
		>
			<Image value={block.media} sizes="(min-width: 80rem) 76rem, 100vw" class="h-auto w-full" />
		</div>
		{#if block.caption}
			<figcaption class="text-muted-foreground mt-3 text-sm">{block.caption}</figcaption>
		{/if}
	</figure>
{/if}
