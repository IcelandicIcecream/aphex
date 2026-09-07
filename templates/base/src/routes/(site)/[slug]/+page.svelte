<script lang="ts">
	import Prose from '$lib/components/Prose.svelte';
	import { Image } from '@aphexcms/cms-core/image';
	import { usePreview } from '@aphexcms/visual-editing';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// `ve.live` swaps in the draft being edited when the studio opens this URL via
	// the schema's `previewUrl`, and is a passthrough otherwise.
	const ve = usePreview();
	const page = $derived(ve.live(data.page, { type: 'page' }));
	const cover = $derived(ve.image(page.coverImage));

	const title = $derived(page.seoTitle || page.title || 'Untitled');
	const description = $derived(page.seoDescription || page.excerpt || '');
</script>

<svelte:head>
	<title>{title}</title>
	{#if description}<meta name="description" content={description} />{/if}
</svelte:head>

<article>
	<header>
		<h1>{page.title ?? 'Untitled'}</h1>
		{#if page.excerpt}
			<p class="excerpt">{page.excerpt}</p>
		{/if}
	</header>

	{#if cover.src}
		<figure class="cover">
			<!-- `priority`: the cover is the largest thing above the fold, so it should
			     not be lazy-loaded — that would delay the LCP it *is*. -->
			<Image
				value={page.coverImage}
				alt={cover.alt || page.title || ''}
				sizes="(min-width: 44rem) 44rem, 100vw"
				priority
			/>
		</figure>
	{/if}

	{#if page.content}
		<Prose value={page.content} />
	{/if}

	<footer>
		<a href="/">← All pages</a>
		<!-- Only for signed-in users: a reader has no studio to go to, and the link
		     would leak that an admin exists at this path. -->
		{#if data.signedIn}
			<!-- The admin is one route that reads `docType`/`docId` from the query
			     string, so this is the deep link — there is no /admin/<type>/<id>. -->
			<a href="/admin?docType=page&docId={page.id}">Edit this page →</a>
		{/if}
	</footer>
</article>

<style>
	article {
		max-width: 44rem;
		margin: 0 auto;
		padding: clamp(4rem, 9vw, 8rem) clamp(1.5rem, 5vw, 3rem) 5rem;
	}
	h1 {
		margin: 0;
		font-size: clamp(2.25rem, 4.5vw, 3.5rem);
		font-weight: 700;
		letter-spacing: -0.035em;
		line-height: 1;
		text-wrap: balance;
	}
	.excerpt {
		max-width: 34rem;
		margin: 1.5rem 0 0;
		color: var(--smoke);
		font-size: clamp(1rem, 1.3vw, 1.125rem);
		line-height: 1.55;
	}
	header {
		padding-bottom: clamp(2rem, 4vw, 3rem);
		border-bottom: 1px solid var(--line);
		margin-bottom: clamp(2rem, 4vw, 3rem);
	}
	.cover {
		margin: 0 0 2.5rem;
	}
	/* `:global` because the <img> is rendered by <Image>, and Svelte's scoping
	   hash stops at the component boundary. */
	.cover :global(img) {
		display: block;
		width: 100%;
		height: auto;
	}
	footer {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
		margin-top: clamp(3rem, 6vw, 5rem);
		padding-top: 1.5rem;
		border-top: 1px solid var(--line);
	}
	footer a {
		font-family: var(--mono);
		font-size: 0.8rem;
		color: var(--smoke);
		text-decoration: none;
		transition: color 120ms ease;
	}
	footer a:hover {
		color: var(--ink);
	}
</style>
