<script lang="ts">
	import Prose from '$lib/components/render/Prose.svelte';
	import Seo from '$lib/blog/Seo.svelte';
	import { seoTitle, seoDescription, seoOgImageUrl } from '$lib/blog/seo';
	import { usePreview, stegaClean } from '@aphexcms/visual-editing';
	import type { Page } from '$lib/generated-types';

	let { data } = $props();
	const ve = usePreview();
	const page = $derived(ve.live<Page>(data.page, { type: 'page' }));

	const cover = $derived(ve.image(page.coverImage));
	// Effective alt: per-placement override → asset default → page title (stega-cleaned).
	const coverAlt = $derived(cover.alt || stegaClean(page.title ?? ''));

	const seoImage = $derived(seoOgImageUrl(page.seo) ?? cover.src);

	// Container padding (a number field, in px) → CSS var on the article. Sourced from the
	// live doc, so dragging the slider in the studio moves the gutters in the preview instantly.
	// Unset → falls back to the stylesheet default.
	const containerPad = $derived(
		page.containerPadding != null ? `${page.containerPadding}px` : null
	);
	// Header alignment (a tabs/segmented string field) → text-align on the header.
	// stegaClean: in preview the string carries invisible stega markers, which would make
	// `text-align: left⁣` an invalid CSS value — strip them so the value is a clean keyword.
	const headerAlign = $derived(stegaClean(page.headerAlign ?? 'left'));
</script>

<Seo
	title={seoTitle(page.seo, page.title)}
	description={seoDescription(page.seo, page.excerpt)}
	image={seoImage}
	noindex={page.seo?.noIndex}
/>

<article class="page" style={containerPad ? `--page-pad: ${containerPad}` : undefined}>
	<header class="page__head" style="text-align: {headerAlign}">
		<h1>{page.title ?? 'Untitled'}</h1>
		{#if page.excerpt}<p class="lead">{page.excerpt}</p>{/if}
	</header>

	{#if cover.src}
		<figure class="cover">
			<!-- In preview, stega the effective alt so the image is click-to-edit even when the
			     alt comes from the asset default. -->
			<img src={cover.src} alt={ve.encode(coverAlt, { field: 'coverImage' })} />
		</figure>
	{/if}

	{#if page.content && Array.isArray(page.content)}
		<Prose value={page.content} />
	{:else}
		<p class="empty-body">This page has no content yet.</p>
	{/if}
</article>

<style>
	.page {
		max-width: 44rem;
		margin: 0 auto;
		/* Horizontal gutter is driven by the document's `containerPadding` field (px),
		   falling back to 2rem when unset. Top/bottom rhythm stays fixed. */
		padding: 4.5rem var(--page-pad, 2rem) 0;
	}
	.page__head h1 {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: clamp(2.4rem, 5.5vw, 3.8rem);
		line-height: 1.02;
		letter-spacing: -0.032em;
		margin: 0;
		color: var(--ink);
	}
	.lead {
		margin: 1.35rem 0 0;
		font-size: 1.32rem;
		line-height: 1.5;
		color: var(--ink-soft);
	}
	.cover {
		margin: 3rem 0 0;
		max-width: 60rem;
		margin-left: 50%;
		transform: translateX(-50%);
		width: 100vw;
		border-radius: 14px;
		overflow: hidden;
		background: var(--rule-soft);
	}
	.cover img {
		width: 100%;
		max-height: 32rem;
		object-fit: cover;
		display: block;
	}
	.empty-body {
		margin-top: 3.25rem;
		color: var(--ink-faint);
		font-style: italic;
	}
	@media (max-width: 640px) {
		.page {
			padding-left: var(--page-pad, 1.25rem);
			padding-right: var(--page-pad, 1.25rem);
		}
		.cover {
			width: 100%;
			margin-left: 0;
			transform: none;
			border-radius: 10px;
		}
		.lead {
			font-size: 1.18rem;
		}
	}
</style>
