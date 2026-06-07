<script lang="ts">
	import { PortableText } from '@portabletext/svelte';
	import BlogImage from '$lib/blog/BlogImage.svelte';
	import BlogCallout from '$lib/blog/BlogCallout.svelte';
	import BlogCodeBlock from '$lib/blog/BlogCodeBlock.svelte';
	import BlogCodeStyle from '$lib/blog/BlogCodeStyle.svelte';
	import BlogLinkMark from '$lib/blog/BlogLinkMark.svelte';
	import { readingTime } from '$lib/blog/reading-time';
	import { getLivePreviewDocument, stegaClean } from '@aphexcms/visual-editing';
	import type { BlogPost } from '$lib/generated-types';

	let { data } = $props();
	const preview = getLivePreviewDocument();
	// preview.current is an untyped postMessage payload — it carries the same live
	// BlogPost shape the editor pushes, so narrow it once here at the boundary.
	const post = $derived((preview.current as BlogPost | null) ?? data.post);

	const coverUrl = $derived(
		post.coverImage?.asset?._ref ? (data.assetUrls[post.coverImage.asset._ref] ?? null) : null
	);

	function formatDate(dateStr: string | null | undefined) {
		if (!dateStr) return null;
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function initials(name: string | undefined) {
		if (!name) return '·';
		return name
			.split(/\s+/)
			.slice(0, 2)
			.map((n) => n[0]?.toUpperCase() ?? '')
			.join('');
	}

	const components = {
		types: {
			image: BlogImage,
			callout: BlogCallout,
			codeBlock: BlogCodeBlock
		},
		block: {
			code: BlogCodeStyle
		},
		marks: {
			link: BlogLinkMark
		}
	};
</script>

<svelte:head>
	<title>{stegaClean(post.title) ?? 'Story'} · Aphex Studio</title>
	{#if post.excerpt}
		<meta name="description" content={stegaClean(post.excerpt)} />
		<meta property="og:description" content={stegaClean(post.excerpt)} />
		<meta name="twitter:description" content={stegaClean(post.excerpt)} />
	{/if}
	<meta property="og:title" content={stegaClean(post.title) ?? 'Story'} />
	<meta property="og:type" content="article" />
	{#if coverUrl}
		<meta property="og:image" content={coverUrl} />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:image" content={coverUrl} />
	{:else}
		<meta name="twitter:card" content="summary" />
	{/if}
	{#if post.postDate}<meta property="article:published_time" content={post.postDate} />{/if}
	{#if post.author}<meta property="article:author" content={post.author} />{/if}
</svelte:head>

<article class="article">
	<a href="/blog" class="back">← All stories</a>

	<header class="article__head">
		<p class="article__meta">
			{#if post.postDate}<time datetime={post.postDate}>{formatDate(post.postDate)}</time>{/if}
			<span class="dot">·</span>
			<span>{readingTime(post.content)}</span>
		</p>

		<h1>{post.title ?? 'Untitled'}</h1>

		{#if post.excerpt}<p class="lead">{post.excerpt}</p>{/if}

		{#if post.author}
			<div class="byline">
				<span class="avatar">{initials(post.author)}</span>
				<div>
					<span class="byline__name">{post.author}</span>
					<span class="byline__role">Author</span>
				</div>
			</div>
		{/if}

		{#if (post.tags?.length ?? 0) > 0}
			<div class="tags">
				{#each post.tags ?? [] as tag}<span>{tag}</span>{/each}
			</div>
		{/if}
	</header>

	{#if coverUrl}
		<figure class="cover">
			<img src={coverUrl} alt={post.title ?? ''} />
		</figure>
	{/if}

	{#if post.content && Array.isArray(post.content)}
		<div class="article-body">
			<PortableText value={post.content} {components} onMissingComponent={false} />
		</div>
	{:else}
		<p class="article-body article-body--empty">This story has no content yet.</p>
	{/if}

	<footer class="article__foot">
		<a href="/blog" class="back">← All stories</a>
	</footer>
</article>

<style>
	.article {
		max-width: 44rem;
		margin: 0 auto;
		padding: 3rem 2rem 0;
	}
	.back {
		display: inline-block;
		font-size: 0.86rem;
		font-weight: 500;
		color: var(--ink-soft);
		text-decoration: none;
		transition: color 0.18s ease;
	}
	.back:hover {
		color: var(--accent-ink);
	}

	/* ---- Head ---- */
	.article__head {
		margin-top: 2.5rem;
	}
	.article__meta {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		font-size: 0.84rem;
		color: var(--ink-faint);
		margin: 0;
	}
	.dot {
		opacity: 0.5;
	}
	.article__head h1 {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: clamp(2.3rem, 5.5vw, 3.6rem);
		line-height: 1.04;
		letter-spacing: -0.032em;
		margin: 1rem 0 0;
		color: var(--ink);
	}
	.lead {
		margin: 1.35rem 0 0;
		font-size: 1.32rem;
		line-height: 1.5;
		color: var(--ink-soft);
		font-weight: 400;
	}
	.byline {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 2rem;
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		border-radius: 999px;
		background: var(--ink);
		color: var(--paper);
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 0.85rem;
		letter-spacing: 0.02em;
	}
	.byline__name {
		display: block;
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--ink);
	}
	.byline__role {
		display: block;
		font-size: 0.8rem;
		color: var(--ink-faint);
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		margin-top: 1.75rem;
	}
	.tags span {
		font-size: 0.74rem;
		font-weight: 500;
		color: var(--ink-soft);
		border: 1px solid var(--rule);
		border-radius: 999px;
		padding: 0.25rem 0.7rem;
	}

	/* ---- Cover ---- */
	.cover {
		margin: 3rem 0 0;
		width: 100vw;
		max-width: 60rem;
		margin-left: 50%;
		transform: translateX(-50%);
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

	/* ---- Body / prose ---- */
	.article-body {
		margin-top: 3.25rem;
		font-size: 1.18rem;
		line-height: 1.78;
		color: #2a271f;
	}
	.article-body--empty {
		color: var(--ink-faint);
		font-style: italic;
	}
	.article-body :global(p) {
		margin: 0 0 1.5rem;
	}
	.article-body :global(h2) {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 1.85rem;
		line-height: 1.18;
		letter-spacing: -0.02em;
		margin: 3rem 0 1rem;
		color: var(--ink);
	}
	.article-body :global(h3) {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 1.42rem;
		line-height: 1.25;
		letter-spacing: -0.015em;
		margin: 2.5rem 0 0.85rem;
		color: var(--ink);
	}
	.article-body :global(h4) {
		font-weight: 600;
		font-size: 1.12rem;
		margin: 2rem 0 0.6rem;
		color: var(--ink);
	}
	.article-body :global(blockquote) {
		margin: 2.25rem 0;
		padding: 0.25rem 0 0.25rem 1.6rem;
		border-left: 3px solid var(--accent);
		font-family: var(--font-display);
		font-style: italic;
		font-size: 1.4rem;
		line-height: 1.45;
		color: var(--ink);
	}
	.article-body :global(ul),
	.article-body :global(ol) {
		margin: 1.5rem 0;
		padding-left: 1.4rem;
	}
	.article-body :global(li) {
		margin-bottom: 0.55rem;
		padding-left: 0.35rem;
	}
	.article-body :global(ul) {
		list-style-type: none;
	}
	.article-body :global(ul li) {
		position: relative;
	}
	.article-body :global(ul li::before) {
		content: '';
		position: absolute;
		left: -1rem;
		top: 0.78em;
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--accent);
	}
	.article-body :global(ol) {
		list-style-type: decimal;
	}
	.article-body :global(code) {
		background: color-mix(in srgb, var(--accent) 9%, transparent);
		color: var(--accent-ink);
		padding: 0.12em 0.4em;
		border-radius: 5px;
		font-size: 0.86em;
		font-family: ui-monospace, 'SF Mono', 'Menlo', monospace;
	}
	.article-body :global(strong) {
		font-weight: 600;
		color: var(--ink);
	}
	.article-body :global(em) {
		font-style: italic;
	}

	/* ---- Foot ---- */
	.article__foot {
		margin-top: 4rem;
		padding-top: 2rem;
		border-top: 1px solid var(--rule-soft);
	}

	@media (max-width: 640px) {
		.article {
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
		.article-body {
			font-size: 1.1rem;
		}
	}
</style>
