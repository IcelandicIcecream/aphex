<script lang="ts">
	import type { ImageValue } from './types';

	/**
	 * Renders an Aphex image field as a single responsive `<img>`.
	 *
	 * Everything it needs — url, dimensions, srcset, default alt — is injected
	 * server-side by `assetService.injectAssetUrls`, so this component holds no
	 * knowledge of the width ladder, the config hash, or how a variant URL is
	 * built. That keeps one place responsible for addressing derivatives and
	 * ships nothing extra to the browser.
	 *
	 * Renders nothing at all when the value has no resolved url, rather than an
	 * `<img>` with an empty `src` — which browsers treat as a request for the
	 * current page and is a real, if quiet, waste of a round trip.
	 */
	interface Props {
		/** An image field value, after asset injection. */
		value: ImageValue | null | undefined;
		/**
		 * Overrides the alt text. Precedence is placement → asset → empty, so a
		 * decorative placement can pass `alt=""` and mean it.
		 */
		alt?: string;
		/**
		 * The `sizes` attribute. Without it a browser assumes the image occupies
		 * the full viewport width and will happily pick the largest candidate on
		 * a phone, which defeats the point of a srcset.
		 */
		sizes?: string;
		/**
		 * Above-the-fold hint. Switches off lazy loading and raises fetch
		 * priority — correct for an LCP image, wasteful for anything else.
		 */
		priority?: boolean;
		class?: string;
		[key: string]: unknown;
	}

	let {
		value,
		alt,
		sizes = '100vw',
		priority = false,
		class: className,
		...rest
	}: Props = $props();

	const asset = $derived(value?.asset);
	const src = $derived(asset?.url);

	// Placement alt wins over the asset's default; an explicitly empty string is
	// preserved, since `alt=""` is the correct markup for a decorative image and
	// is meaningfully different from a missing alt.
	const resolvedAlt = $derived(alt ?? value?.alt ?? asset?.alt ?? '');
</script>

{#if src}
	<img
		{src}
		alt={resolvedAlt}
		srcset={asset?.srcset || undefined}
		sizes={asset?.srcset ? sizes : undefined}
		width={asset?.width || undefined}
		height={asset?.height || undefined}
		loading={priority ? 'eager' : 'lazy'}
		fetchpriority={priority ? 'high' : undefined}
		decoding="async"
		class={className}
		{...rest}
	/>
{/if}
