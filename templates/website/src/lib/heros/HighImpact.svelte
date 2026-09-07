<script lang="ts">
	/**
	 * High impact — a full-bleed image with the copy centred on it.
	 *
	 * Two details carry the whole composition, both ported from Payload's website
	 * template:
	 *
	 * 1. **`-mt-24` pulls the hero up under the header.** The header is `h-24` and
	 *    sits in normal flow, so cancelling exactly that much puts the image at the
	 *    very top of the viewport with the header floating on it. No absolute
	 *    positioning, and nothing to undo on pages without a full-bleed hero.
	 *
	 * 2. **`data-theme="dark"` themes the region, not the elements.** Everything
	 *    inside reads the dark palette from `app.css`, so the copy resolves to
	 *    white here using the same classes the rest of the site uses.
	 *
	 *    The standfirst is `text-foreground/85`, not `text-muted-foreground`. Grey
	 *    reads as recessive on a flat page but as *washed out* over a photograph,
	 *    where the image is already competing with it — over an image the
	 *    subordinate text still wants to be near-white, and opacity is what
	 *    separates it from the headline.
	 *
	 *    `text-foreground` has to be repeated on this section, and that is not
	 *    redundant. The shell already sets it, which resolves `--foreground` to the
	 *    *light* value and computes a colour there; `color` then inherits as that
	 *    computed value, so redefining the variable further down changes nothing.
	 *    Re-applying the class is what forces the colour to be recomputed against
	 *    the region's tokens. Any element that switches theme has to do this.
	 *
	 * Centred, narrow measure. A wide left-aligned block of white text over a
	 * photograph is the most template-looking arrangement there is; centring on a
	 * ~36rem measure is what makes it read as a designed page.
	 */
	import { Image } from '@aphexcms/cms-core/image';
	import { usePreview } from '@aphexcms/visual-editing';
	import RichText from '$lib/components/RichText.svelte';
	import CMSLink from '$lib/components/CMSLink.svelte';
	import { control } from '$lib/utils/stega';
	import type { HeroValue } from './types';

	let { hero }: { hero: HeroValue } = $props();

	const links = $derived((hero.links ?? []).slice(0, 2));

	/**
	 * `ve.edit(...)` returns the `data-aphex-*` attributes the visual-editing
	 * overlay keys on, so clicking the image in preview reveals that field in the
	 * studio's form pane. It returns `{}` outside preview, so this costs nothing on
	 * the live site.
	 *
	 * An image needs this explicitly. Text becomes clickable on its own — the
	 * stega markers travel inside the string — but an image has no string to carry
	 * them, so without these attributes it is the one thing on the page an editor
	 * cannot click.
	 */
	const ve = usePreview();
</script>

<section
	class="text-foreground relative -mt-24 flex min-h-[85vh] items-center justify-center overflow-hidden bg-black"
	data-theme="dark"
>
	{#if hero.media?.asset?.url}
		<!-- `priority`: this is the largest element above the fold, so it *is* the
		     LCP. Lazy-loading it would delay the very metric it defines.
		     `select-none` because a hero image is scenery — dragging it or catching
		     it in a text selection is only ever an accident. -->
		<div class="absolute inset-0" {...ve.edit({ field: 'hero.media' })}>
			<Image
				value={hero.media}
				alt=""
				sizes="100vw"
				priority
				class="h-full w-full object-cover select-none"
			/>
		</div>
	{/if}

	<!-- A slight darkening pass. The seeded hero art is dark by design, but an
	     editor will eventually upload a bright photograph, and this is the
	     difference between "legible on anything" and "legible on what we shipped
	     with". Light enough to leave a good image looking like itself. -->
	<div class="absolute inset-0 bg-black/35" aria-hidden="true"></div>

	<div class="relative z-10 container py-28 text-center">
		<div
			class="[&_p]:text-foreground/85 mx-auto max-w-[36.5rem] [&_h1]:text-4xl [&_h1]:font-semibold [&_h1]:tracking-tight sm:[&_h1]:text-5xl lg:[&_h1]:text-6xl [&_p]:mt-6 [&_p]:text-lg"
		>
			<RichText value={hero.richText} class="text-balance" />

			{#if links.length}
				<div class="mt-9 flex flex-wrap justify-center gap-3">
					{#each links as link, i (i)}
						<CMSLink {link} appearance={control(link.appearance) ?? 'default'} />
					{/each}
				</div>
			{/if}
		</div>
	</div>
</section>
