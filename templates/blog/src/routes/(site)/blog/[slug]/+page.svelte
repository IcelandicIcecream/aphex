<script lang="ts">
	import Prose from '$lib/blog/Prose.svelte';
	import Seo from '$lib/blog/Seo.svelte';
	import { readingTime } from '$lib/blog/reading-time';
	import { postTags } from '$lib/blog/tags';
	import { postAuthor } from '$lib/blog/authors';
	import { seoTitle, seoDescription, seoOgImageUrl } from '$lib/blog/seo';
	import { usePreview, stegaClean } from '@aphexcms/visual-editing';
	import type { BlogPost } from '$lib/generated-types';

	let { data } = $props();
	const ve = usePreview();
	// Live document (when previewing) merged over the server fallback.
	const post = $derived(ve.live<BlogPost>(data.post));
	const cover = $derived(ve.image(post.coverImage));
	// Effective alt: per-placement override → asset default → post title (stega-cleaned so
	// the title's own marker can never leak onto the image).
	const coverAlt = $derived(cover.alt || stegaClean(post.title ?? ''));
	const tags = $derived(postTags(post.tags, data.tagMap));
	const author = $derived(postAuthor(post.author, data.authorMap));
	const authorAvatar = $derived(author?.avatarUrl ?? null);

	// SEO image: explicit social image, else the cover.
	const seoImage = $derived(seoOgImageUrl(post.seo) ?? cover.src);
	const modifiedTime = $derived(
		post._meta?.updatedAt ? new Date(post._meta.updatedAt).toISOString() : undefined
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
</script>

<Seo
	title={seoTitle(post.seo, post.title)}
	description={seoDescription(post.seo, post.excerpt)}
	image={seoImage}
	type="article"
	noindex={post.seo?.noIndex}
	publishedTime={post.postDate}
	{modifiedTime}
	authorName={author?.name}
/>

<article class="article">
	<a href="/blog" class="back">← All stories</a>

	<header class="article__head">
		<p class="article__meta">
			{#if post.postDate}<time datetime={ve.encode(post.postDate, { field: 'postDate' })}
					>{formatDate(post.postDate)}</time
				>{/if}
			<span class="dot">·</span>
			<span>{readingTime(post.content)}</span>
		</p>

		<h1>{post.title ?? 'Untitled'}</h1>

		{#if post.excerpt}<p class="lead">{post.excerpt}</p>{/if}

		{#if author}
			<a class="byline" href="/author/{author.slug}">
				{#if authorAvatar}
					<img class="avatar avatar--photo" src={authorAvatar} alt={author.name} />
				{:else}
					<span class="avatar">{initials(author.name)}</span>
				{/if}
				<div>
					<span class="byline__name">{author.name}</span>
					<span class="byline__role">{author.role ?? 'Author'}</span>
				</div>
			</a>
		{/if}

		{#if tags.length > 0}
			<div class="tags">
				{#each tags as tag, i}<a class="tag" href="/tag/{tag.slug}"
						>{ve.encode(tag.title, { field: 'tags', arrayIndex: i })}</a
					>{/each}
			</div>
		{/if}
	</header>

	{#if cover.src}
		<figure class="cover">
			<!-- In preview, stega the effective alt so the image is click-to-edit even when the
			     alt comes from the asset default (which carries no marker of its own). -->
			<img src={cover.src} alt={ve.encode(coverAlt, { field: 'coverImage' })} />
		</figure>
	{/if}

	{#if post.content && Array.isArray(post.content)}
		<Prose value={post.content} />
	{:else}
		<p class="empty-body">This story has no content yet.</p>
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
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 2rem;
		text-decoration: none;
		color: inherit;
	}
	.byline:hover .byline__name {
		color: var(--accent-ink);
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
		flex-shrink: 0;
	}
	.avatar--photo {
		object-fit: cover;
	}
	.byline__name {
		transition: color 0.18s ease;
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
	.tags .tag {
		font-size: 0.74rem;
		font-weight: 500;
		color: var(--ink-soft);
		border: 1px solid var(--rule);
		border-radius: 999px;
		padding: 0.25rem 0.7rem;
		text-decoration: none;
		transition:
			color 0.18s ease,
			border-color 0.18s ease;
	}
	.tags .tag:hover {
		color: var(--accent-ink);
		border-color: var(--accent);
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

	.empty-body {
		margin-top: 3.25rem;
		color: var(--ink-faint);
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
	}
</style>
