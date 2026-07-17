<script lang="ts">
	import { readingTime } from './reading-time';
	import { postTags, type TagInfo } from './tags';
	import { usePreview } from '@aphexcms/visual-editing';
	import type { BlogPost } from '$lib/generated-types';

	let {
		post,
		tagMap
	}: {
		post: BlogPost;
		tagMap: Record<string, TagInfo>;
	} = $props();

	const ve = usePreview();
	const cover = $derived(ve.image(post.coverImage));
	// Effective alt: per-placement override → asset default → post title.
	const coverAlt = $derived(cover.alt || post.title);
	const tags = $derived(postTags(post.tags, tagMap));

	function formatDate(dateStr: string | null | undefined) {
		if (!dateStr) return null;
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<article class="card">
	<!-- These cards aren't a stored reference on the previewed document (they're an
	     app-level query), but ve.edit() makes each one click-to-edit its own post in
	     the studio preview. Outside preview it returns no attributes. -->
	<a href="/blog/{post.slug}" {...ve.edit({ id: post.id, type: 'blog_post' })}>
		{#if cover.src}
			<div class="card__media">
				<img src={cover.src} alt={coverAlt} loading="lazy" />
			</div>
		{/if}
		<p class="meta">
			{#if post.postDate}<time datetime={post.postDate}>{formatDate(post.postDate)}</time>{/if}
			<span class="meta__dot">·</span>
			<span>{readingTime(post.content)}</span>
		</p>
		<h3>{post.title ?? 'Untitled'}</h3>
		{#if post.excerpt}<p class="card__excerpt">{post.excerpt}</p>{/if}
	</a>
	{#if tags.length > 0}
		<div class="tags">
			{#each tags as tag}<a class="tag" href="/tag/{tag.slug}">{tag.title}</a>{/each}
		</div>
	{/if}
</article>

<style>
	.card a {
		text-decoration: none;
		color: inherit;
		display: block;
	}
	.card__media {
		overflow: hidden;
		border-radius: 10px;
		aspect-ratio: 16 / 10;
		margin-bottom: 1.25rem;
		background: var(--rule-soft);
	}
	.card__media img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.card:hover .card__media img {
		transform: scale(1.03);
	}
	.meta {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		font-size: 0.82rem;
		color: var(--ink-faint);
		margin: 0;
	}
	.meta__dot {
		opacity: 0.5;
	}
	.card h3 {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 1.6rem;
		line-height: 1.12;
		letter-spacing: -0.022em;
		margin: 0.75rem 0 0;
		color: var(--ink);
		transition: color 0.18s ease;
	}
	.card:hover h3 {
		color: var(--accent-ink);
	}
	.card__excerpt {
		margin: 0.7rem 0 0;
		font-size: 0.98rem;
		line-height: 1.55;
		color: var(--ink-soft);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 1rem;
	}
	.tags .tag {
		font-size: 0.72rem;
		font-weight: 500;
		color: var(--ink-soft);
		border: 1px solid var(--rule);
		border-radius: 999px;
		padding: 0.22rem 0.6rem;
		text-decoration: none;
		transition:
			color 0.18s ease,
			border-color 0.18s ease;
	}
	.tags .tag:hover {
		color: var(--accent-ink);
		border-color: var(--accent);
	}
</style>
