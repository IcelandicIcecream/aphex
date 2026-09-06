<script lang="ts">
	/**
	 * An `<img>` that degrades to a placeholder instead of the browser's
	 * broken-image glyph.
	 *
	 * Two ways an asset fails to render, both landing on the same fallback:
	 *
	 * - The format is undecodable everywhere (HEIC — see `browserCanDecodeImage`).
	 *   Known up front, so no request is made and there is no flash of a broken
	 *   icon while it fails.
	 * - The load fails for any other reason — the object is gone, a signed URL has
	 *   expired, the file is truncated. Only `onerror` can tell us that.
	 *
	 * The same reasoning the grid already applies to posterless videos, which the
	 * note by `backfillPosters` puts as a grid of broken <img> being worse than
	 * no image at all.
	 */
	import { ImageOff } from '@lucide/svelte';
	import { browserCanDecodeImage } from '../../utils/image-support';

	interface Props {
		src: string | null | undefined;
		alt?: string;
		/** Applied to the `<img>` and to the placeholder, so layout holds either way. */
		class?: string;
		style?: string;
		loading?: 'lazy' | 'eager';
		/** The asset's stored MIME type, used to skip a load that cannot succeed. */
		mimeType?: string | null;
		/** Caption under the placeholder icon. Omit in tiles too small to read it. */
		label?: string;
	}

	let { src, alt = '', class: className = '', style, loading, mimeType, label }: Props = $props();

	// Keyed by the src that failed rather than a bare boolean: pointing this
	// instance at a different asset must get a fresh attempt, or one broken image
	// would poison every asset later rendered through the same component.
	let failedSrc = $state<string | null>(null);
	const failed = $derived(!!src && failedSrc === src);
	const showPlaceholder = $derived(!src || failed || !browserCanDecodeImage(mimeType));
</script>

{#if showPlaceholder}
	<div
		class="bg-muted/40 text-muted-foreground flex flex-col items-center justify-center gap-1 {className}"
		{style}
		title={label ?? alt}
	>
		<ImageOff class="h-4 w-4 shrink-0" />
		{#if label}
			<span class="px-2 text-center text-[10px] leading-tight">{label}</span>
		{/if}
	</div>
{:else}
	<img {src} {alt} class={className} {style} {loading} onerror={() => (failedSrc = src ?? null)} />
{/if}
