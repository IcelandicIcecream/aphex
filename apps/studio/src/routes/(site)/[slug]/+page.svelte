<script lang="ts">
	import Prose from '$lib/blog/Prose.svelte';
	import Seo from '$lib/blog/Seo.svelte';
	import { seoTitle, seoDescription, seoOgImageRef } from '$lib/blog/seo';
	import { getLivePreviewDocument, stegaClean } from '@aphexcms/visual-editing';
	import type { Page } from '$lib/generated-types';

	let { data } = $props();
	const preview = getLivePreviewDocument();
	// preview.current is an untyped postMessage payload carrying the live Page shape.
	const page = $derived((preview.current as Page | null) ?? data.page);

	const coverUrl = $derived(
		page.coverImage?.asset?._ref ? (data.assetUrls[page.coverImage.asset._ref] ?? null) : null
	);
	// Effective alt: per-placement override → asset default → page title (stega-cleaned).
	const coverAlt = $derived(
		page.coverImage?.alt ||
			(page.coverImage?.asset?._ref ? (data.assetAlts[page.coverImage.asset._ref] ?? '') : '') ||
			stegaClean(page.title ?? '')
	);
	const ogRef = $derived(seoOgImageRef(page.seo));
	const seoImage = $derived((ogRef ? data.assetUrls[ogRef] : null) ?? coverUrl);
</script>

<Seo
	title={seoTitle(page.seo, page.title)}
	description={seoDescription(page.seo, page.excerpt)}
	image={seoImage}
	noindex={page.seo?.noIndex}
/>

<article class="page">
	<header class="page__head">
		<h1>{page.title ?? 'Untitled'}</h1>
		{#if page.excerpt}<p class="lead">{page.excerpt}</p>{/if}
	</header>

	{#if coverUrl}
		<figure class="cover">
			<img src={coverUrl} alt={coverAlt} />
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
		padding: 4.5rem 2rem 0;
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
			padding-left: 1.25rem;
			padding-right: 1.25rem;
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
